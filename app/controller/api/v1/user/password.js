'use strict'

module.exports = app => {

  class PasswordController extends app.BaseController {

    async update() {

      const input = this.filter(this.input, {
        password: 'trim',
        old_password: 'trim',
      })

      this.validate(input, {
        password: 'password',
        old_password: 'password',
      })

      await this.ctx.service.account.user.setPassword(input)

    }
  }

  return PasswordController

}