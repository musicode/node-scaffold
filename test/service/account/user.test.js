
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/user.test.js', () => {

  describe('user service', () => {

    it('compare hash password', async () => {
      const ctx = app.mockContext()
      const userService = ctx.service.account.user

      let password = 'abc123'
      let hash = await userService.createHash(password)

      let result = await userService.checkPassword(password, hash)
      assert(result === true)

      result = await userService.checkPassword('abc12', hash)
      assert(result === false)
    })

    it('sign up', async () => {

      const ctx = app.mockContext()
      const userService = ctx.service.account.user

      let mobile = '1' + ctx.helper.randomInt(10)
      let password = 'Abc123'
      let nickname = 'haha'
      let gender = 1
      let company = 'baidu'
      let job = 'fe'

      let userId = await userService.signup({
        mobile,
        password,
        nickname,
        gender,
        company,
        job,
      })

      let user = await userService.getUserById(userId)

      assert(userId != null)
      assert(user.mobile === mobile)
      assert(user.nickname === nickname)
      assert(user.gender === gender)
      assert(user.company === company)
      assert(user.job === job)

      try {
        await userService.signup({
          mobile,
          password,
          nickname,
          gender,
          company,
          job,
        })
      }
      catch (err) {

      }

    })

  })
})