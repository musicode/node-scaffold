'use strict'

module.exports = app => {

  const { util, limit } = app

  class SmsController extends app.BaseController {

    async signup() {

      const input = this.filter(this.input, {
        mobile: 'trim',
      })

      this.validate(input, {
        mobile: 'mobile',
      })

      const { account, sms } = this.ctx.service

      await sms.message.sendMessage(
        input.mobile,
        'SMS_98345164',
        {
          code: sms.message.createCode(),
        }
      )

    }

  }

  return SmsController

}