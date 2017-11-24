'use strict'

module.exports = app => {

  class EmailController extends app.BaseController {

    async update() {

      const input = this.filter(this.input, {
        email: 'trim',
      })

      this.validate(input, {
        email: 'email',
      })

      await this.ctx.service.account.user.setEmail(input)

    }
  }

  return EmailController

}