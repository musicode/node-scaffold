'use strict'

module.exports = app => {

  class AuthController extends app.BaseController {

    async signup() {

      const input = this.filter(this.input, {
        nickname: 'trim',
        gender: 'number',
        company: 'trim',
        job: 'trim',
        mobile: 'trim',
        password: ['trim', 'lower'],
        verify_code: 'trim'
      })

      this.validate(input, {
        nickname: {
          type: 'string',
          max: 20,
          min: 2
        },
        gender: [1, 2],
        company: {
          empty: true,
          type: 'string',
        },
        job: {
          empty: true,
          type: 'string',
        },
        mobile: 'mobile',
        password: 'password',
        verify_code: 'verify_code'
      })

      const userService = this.ctx.service.account.user

      const userId = await userService.signup(input)

      this.output.user = await userService.getUserById(userId)

    }
  }

  return AuthController

}
