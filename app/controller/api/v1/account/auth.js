'use strict'

module.exports = app => {

  class AuthController extends app.BaseController {
    async signup() {
      this.validate({
        nickname: {
          required: true,
          type: 'string'
        },
        gender: [1, 2],
        // company: 'string',
        // job: 'string',
        // mobile: {
        //   required: true,
        //   type: 'mobile',
        // },
        // password: {
        //   required: true,
        //   type: 'string'
        // },
      })
    }
  }

  return AuthController

}
