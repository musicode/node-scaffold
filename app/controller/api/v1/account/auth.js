'use strict'

module.exports = app => {

  class AuthController extends app.BaseController {
    signup() {
      this.validate({
        username: {
          required: true,
          type: 'string'
        },
        password: {
          required: true,
          type: 'string'
        }
      })
      this.success()
    }
  }

  return AuthController

}
