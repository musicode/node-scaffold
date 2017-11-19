'use strict'

const code = require('../../../../constant/code')

module.exports = app => {

  class AuthController extends app.BaseController {

    async signup() {

      let input = this.filter(this.input, {
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

      let { service } = this.ctx

      let user = await service.account.user.signup(input)

      await service.account.session.set(
        app.config.session.currentUser,
        user.id
      )

      this.output.user = user

    }
  }

  return AuthController

}
