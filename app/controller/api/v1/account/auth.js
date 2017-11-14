'use strict'

module.exports = app => {

  class AuthController extends app.BaseController {
    async signup() {
      this.validate({
        hash: {
          required: true,
          type: 'string'
        },
        password: {
          required: true,
          type: 'string'
        }
      })
    }
  }

  return AuthController

}
