'use strict'

module.exports = app => {

  class AuthController extends app.BaseController {
    signup() {
      console.log(11)
      throw new Error('22')
      // this.validate({
      //   username: {
      //     required: true,
      //     type: 'string'
      //   },
      //   password: {
      //     required: true,
      //     type: 'string'
      //   }
      // })
      // this.success()
    }
  }

  return AuthController

}
