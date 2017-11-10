'use strict'

let bcrypt = require('bcryptjs')

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
      this.ctx.output.hash = bcrypt.hashSync(this.ctx.input.password)
      this.ctx.output.compare = bcrypt.compareSync(this.ctx.input.password, this.ctx.input.hash)
      this.success()
    }
  }

  return AuthController

}
