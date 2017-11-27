
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/profile_allowed.test.js', () => {

  describe('profile allowed service', () => {

    let user

    it('register a new user', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      let registerUser = async user => {
        let userId = await userService.signup({
          mobile: user.mobile,
          password: user.password,
          verify_code: '123133',
        })
        user.id = userId
        await userService.signout()
        return user
      }

      user = await registerUser({
        mobile: '1' + app.util.randomInt(10),
        password: '123456',
      })

    })

    it('profile allowed getter/setter', async () => {

      const ctx = app.mockContext()
      const { account, privacy } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      let allowedType = await privacy.profileAllowed.getAllowedTypeByUserId(user.id)
      assert(allowedType === 0)

      let errorCount = 0
      try {
        // 只能修改自己的，所以要登录态
        await privacy.profileAllowed.setAllowedType(0)
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
        errorCount++
      }

      assert(errorCount === 1)

      await userService.signin({
        mobile: user.mobile,
        password: user.password,
      })

      try {
        // 不存在的枚举值，不能设置
        await privacy.profileAllowed.setAllowedType(100)
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
        errorCount++
      }

      assert(errorCount === 2)

      let test = async value => {
        await privacy.profileAllowed.setAllowedType(value)
        let allowedType = await privacy.profileAllowed.getAllowedTypeByUserId(user.id)
        assert(allowedType === value)
      }

      await test(2)
      await test(1)
      await test(0)

    })


  })
})