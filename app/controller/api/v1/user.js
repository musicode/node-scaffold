'use strict'

module.exports = app => {

  class UserController extends app.BaseController {

    async update() {

      const input = this.filter(this.input, {
        nickname: 'trim',
        gender: 'number',
        mobile: 'trim',
        email: 'trim',
        avatar: 'trim',
        domain: 'trim',
        intro: 'trim',
        company: 'trim',
        job: 'trim',
        area_id: 'int',
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
        password: {
          empty: false,
          type: 'password',
        },
        verify_code: 'verify_code'
      })

      const userService = this.ctx.service.account.user

    }
  }

  return UserController

}