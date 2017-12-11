
'use strict'

const SMSClient = require('@alicloud/sms-sdk')

module.exports = app => {

  const { code, util, config } = app

  class Message extends app.BaseService {

    async sendMessage(mobile, template, params) {

      const { account } = this.service

      if (!params.code) {
        this.throw(
          code.INNER_ERROR,
          '缺少 params.code'
        )
      }

      const smsClient = new SMSClient({
        accessKeyId: config.sms.accessKey,
        secretAccessKey: config.sms.secretKey,
      })

      await smsClient.sendSMS({
        PhoneNumbers: mobile,
        SignName: config.sms.signName,
        TemplateCode: template,
        TemplateParam: JSON.stringify(params)
      })
      .then(
        async res => {
          if (res.Code === 'OK') {
            await account.session.setVerifyCode(mobile, params.code)
          }
          else {
            this.throw(
              code.OUTER_ERROR,
              '短信发送失败'
            )
          }
        },
        err => {
          throw err
        }
      )

    }

    createCode() {
      return '' + util.randomInt(6)
    }

  }
  return Message
}