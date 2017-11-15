'use strict'

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
          required: true,
          type: 'string',
          max: 20,
          min: 2
        },
        gender: [1, 2],
        company: {
          required: false,
          type: 'string',
        },
        mobile: 'mobile',
        password: 'string',
        verify_code: 'verify_code'
      })
    }
  }

  return AuthController

}
