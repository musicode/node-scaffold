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

      await account.user.checkMobileAvailable(input.mobile)

      await sms.message.sendMessage(
        input.mobile,
        'SMS_98345164',
        {
          code: sms.message.createCode(),
        }
      )

    }

    async updateMobile() {

      const input = this.filter(this.input, {
        mobile: 'trim',
      })

      this.validate(input, {
        mobile: 'mobile',
      })

      const { account, sms } = this.ctx.service

      await account.user.checkMobileAvailable(input.mobile)

      await sms.message.sendMessage(
        input.mobile,
        'SMS_98345162',
        {
          code: sms.message.createCode(),
        }
      )

    }

    async resetPassword() {

      const input = this.filter(this.input, {
        mobile: 'trim',
      })

      this.validate(input, {
        mobile: 'mobile',
      })

      const { account, sms } = this.ctx.service

      const user = await this.findOneBy({
        mobile: input.mobile,
      })

      if (!user) {
        this.throw(
          code.PARAM_INVALID,
          '该手机号未注册，无法重置密码'
        )
      }

      await sms.message.sendMessage(
        input.mobile,
        'SMS_98345163',
        {
          code: sms.message.createCode(),
        }
      )

    }

  }

  return SmsController

}