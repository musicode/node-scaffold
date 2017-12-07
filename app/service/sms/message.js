
'use strict'

const SMSClient = require('@alicloud/sms-sdk')

module.exports = app => {

  const { code, util, config } = app

  class Message extends app.BaseService {

    async sendMessage(mobile, template, params) {

      const { account } = this.service

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
            await account.session.setExpire(
              config.session.verifyCode,
              params.code,
              config.expireTime.verifyCode
            )
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