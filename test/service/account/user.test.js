
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/user.test.js', () => {

  describe('user service', () => {

    let existedMobile, existedPassword

    it('compare hash password', async () => {
      const ctx = app.mockContext()
      const userService = ctx.service.account.user

      let password = 'abc123'
      let hash = await userService.createHash(password)

      assert(typeof hash === 'string')
      assert(hash.length > 10)

      let result = await userService.checkPassword(password, hash)
      assert(result === true)

      result = await userService.checkPassword('ABC123', hash)
      assert(result === true)

      result = await userService.checkPassword('abc12', hash)
      assert(result === false)
    })

    it('sign up', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      let currentUser = await account.session.checkCurrentUser()
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

      assert(userId != null)

      // 注册会进入登录态
      currentUser = await account.session.checkCurrentUser()
      assert(currentUser != null)


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
        existedMobile = mobile
        existedPassword = password

      }

    })

    it('sign in', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      // 确保从没登录测起
      let currentUser = await account.session.checkCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      let user = await userService.signin({
        mobile: existedMobile,
        password: existedPassword,
      })

      assert(app.util.type(user) === 'object')
      assert(user.mobile === existedMobile)

      currentUser = await account.session.checkCurrentUser()
      assert(app.util.type(currentUser) === 'object')

      try {
        await userService.signin({
          mobile: existedMobile,
          password: existedPassword,
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
          mobile: existedMobile,
          password: '_____',
        })
      }
      catch (err) {
        // 密码错误
        assert(err.code === app.code.AUTH_ERROR)
      }

    })

  })
})