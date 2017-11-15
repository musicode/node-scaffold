'use strict'

const code = require('../../../../constant/code')

module.exports = app => {

  class AuthController extends app.BaseController {
    async signup() {

      let input = this.filter(this.input, {
        nickname: 'trim',
        gender: 'number',
        company: 'trim',
        job: 'trim',
        mobile: 'trim',
        password: ['trim', 'lower'],
        verify_code: 'trim'
      })

      this.validate(input, {
        nickname: {
          type: 'string',
          max: 20,
          min: 2
        },
        gender: [1, 2],
        company: {
          empty: true,
          type: 'string',
        },
        job: {
          empty: true,
          type: 'string',
        },
        mobile: 'mobile',
        password: 'password',
        verify_code: 'verify_code'
      })

      let { service, helper, request } = this.ctx

      let userService = service.account.user
      let userInfoService = service.account.userInfo
      let registerService = service.account.register

      let user = await userService.findOneByMobile(input.mobile)
      if (user) {
        this.throw(
          code.RESOURCE_EXISTS,
          '该手机号已注册'
        )
      }

      let result = await userService.insert({
        number: helper.randomInt(11),
        mobile: input.mobile,
        password: input.password,
      })

      if (result.affectedRows !== 1) {
        this.throw(
          code.DB_INSERT_ERROR,
          '注册失败'
        )
      }

      let userId = result.insertId

      await userInfoService.insert({
        userId,
        nickname: input.nickname,
        gender: input.gender,
        company: input.company,
        job: input.job
      })

      await registerService.insert({
        userId,
        clientIp: request.ip,
        userAgent: request.get('user-agent'),
      })

    }
  }

  return AuthController

}
