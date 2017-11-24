'use strict'

module.exports = app => {

  class MobileController extends app.BaseController {

    async update() {

      const input = this.filter(this.input, {
        mobile: 'trim',
        verify_code: 'trim',
      })

      this.validate(input, {
        mobile: 'mobile',
        verify_code: 'verify_code',
      })

      await this.ctx.service.account.user.setMobile(input)

    }
  }

  return MobileController

}