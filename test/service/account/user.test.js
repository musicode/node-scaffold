
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/user.test.js', () => {

  describe('user service', () => {

    let user1, user2

    it('compare hash password', async () => {
      const ctx = app.mockContext()
      const userService = ctx.service.account.user

      let password = 'abc123'
      let hash = await userService.createHash(password)

      assert(typeof hash === 'string')
      assert(hash.length > 10)

      let result = await userService.checkPassword(password, hash)
      assert(result === true)

      // 密码经过小写后 hash，所以大写的也会经过小写化再比较
      result = await userService.checkPassword('ABC123', hash)
      assert(result === true)

      result = await userService.checkPassword('abc12', hash)
      assert(result === false)
    })

    it('sign up', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      let mobile = '1' + app.util.randomInt(10)
      let password = 'abc123'
      let nickname = 'haha'
      let gender = 1
      let company = 'baidu'
      let job = 'fe'
      let verify_code = '123133'

      let userId = await userService.signup({
        mobile,
        password,
        nickname,
        gender,
        company,
        job,
        verify_code,
      })

      assert(app.util.type(userId) === 'number')

      // 注册会进入登录态
      currentUser = await account.session.getCurrentUser()
      assert(currentUser != null)


      // 方便测试登录
      user1 = {
        mobile,
        password,
      }

      // 取出刚入库的用户数据
      let user = await userService.getUserById(userId)

      assert(user != null)
      assert(user.mobile === mobile)
      assert(user.nickname === nickname)
      assert(user.gender === gender)
      assert(user.company === company)
      assert(user.job === job)

      // userService.getUserById 会写入 redis，这里应该可以读到
      let cacheStr = await app.redis.get(`user:${userId}`)
      assert(typeof cacheStr === 'string')

      // 和注册对象应该是一样的
      assert(cacheStr === app.util.stringifyObject(user))

      // 再次注册该手机号应提示手机已注册
      try {
        await userService.signup({
          mobile,
          password,
          nickname,
          gender,
          company,
          job,
          verify_code,
        })
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_EXISTS)
      }

      // 再注册一个新手机
      // 因为注册会直接进入登录态，再注册会提示已登录，无法注册
      mobile = '1' + app.util.randomInt(10)
      try {
        await userService.signup({
          mobile,
          password,
          nickname,
          gender,
          company,
          job,
          verify_code,
        })
      }
      catch (err) {
        // 退出再注册会成功
        await userService.signout()
        userId = await userService.signup({
          mobile,
          password,
          nickname,
          gender,
          company,
          job,
          verify_code,
        })
        assert(userId != null)

        // 方便测试登录
        user2 = {
          mobile,
          password,
        }

      }

    })

    it('sign in', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      // 确保从没登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      let user = await userService.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      assert(app.util.type(user) === 'object')
      assert(user.mobile === user1.mobile)

      currentUser = await account.session.getCurrentUser()
      assert(app.util.type(currentUser) === 'object')

      try {
        await userService.signin({
          mobile: user1.mobile,
          password: user1.password,
        })
      }
      catch (err) {
        // 登录态无法再登录
        assert(err.code === app.code.RESOURCE_EXISTS)
        // 退出
        await userService.signout()
      }

      try {
        await userService.signin({
          mobile: '1' + app.util.randomInt(10),
          password: '_____',
        })
      }
      catch (err) {
        // 手机号未注册
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
      }

      try {
        await userService.signin({
          mobile: user1.mobile,
          password: '_____',
        })
      }
      catch (err) {
        // 密码错误无法登入
        assert(err.code === app.code.AUTH_ERROR)
      }

    })

    it('set mobile', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      // 确保从没登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      try {
        // 缺少验证码
        await userService.setMobile({
          mobile: user1.mobile,
        })
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
      }

      try {
        // 未登录
        await userService.setMobile({
          mobile: user1.mobile,
          verify_code: '111111'
        })
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
      }

      // 登录才有权限修改自己的手机号
      currentUser = await userService.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      assert(app.util.type(currentUser) === 'object')

      try {
        // 修改成别人的手机号
        await userService.setMobile({
          mobile: user2.mobile,
          verify_code: '123123'
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
      }

      let mobile = '1' + app.util.randomInt(10)
      let result = await userService.setMobile({
        mobile: mobile,
        verify_code: '123123'
      })

      assert(result === true)

      currentUser = await userService.getUserById(currentUser.id)

      assert(currentUser.mobile === mobile)

      user1.mobile = mobile

    })


    it('set password', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      // 确保从没登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      try {
        // 未登录
        await userService.setPassword({
          password: user1.password,
          old_password: user1.password
        })
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
      }

      // 登录才有权限修改自己的手机号
      currentUser = await userService.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      assert(app.util.type(currentUser) === 'object')

      try {
        // 缺少 old password
        await userService.setPassword({
          password: user1.password,
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
      }

      try {
        // 旧密码错误
        await userService.setPassword({
          password: user1.password,
          old_password: user1.password + '11'
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
      }


      let password = '123321123'
      let result = await userService.setPassword({
        password: password,
        old_password: user1.password,
      })

      assert(result === true)

      currentUser = await userService.getUserById(currentUser.id)

      let matched = await userService.checkPassword(password, currentUser.password)

      assert(matched === true)

      user1.password = password

    })


    it('set email', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      // 确保从没登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      let email = app.util.randomInt(10) + '@qq.com'

      try {
        // 未登录
        await userService.setEmail({
          email
        })
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
      }

      // 登录才有权限修改自己的手机号
      currentUser = await userService.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      assert(app.util.type(currentUser) === 'object')

      let result = await userService.setEmail({
        email
      })

      assert(result === true)

      currentUser = await userService.getUserById(currentUser.id)

      assert(currentUser.email === email)

      // 退出登录
      await userService.signout()

      // 把 user2 的邮箱改成 user1 的
      currentUser = await userService.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      try {
        await userService.setEmail({
          email
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
      }

    })

  })
})