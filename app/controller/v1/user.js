'use strict'

module.exports = app => {

  const { code, limit, config } = app

  class UserController extends app.BaseController {

    async detail() {

      const input = this.filter(this.input, {
        user_id: ['trim', 'number'],
      })

      this.validate(input, {
        user_id: {
          type: 'number',
        }
      })

      const { account } = this.ctx.service

      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      try {
        this.output.user = await account.user.viewUser(user.id)
      }
      catch (err) {
        if (err.code === code.PERMISSION_DENIED) {
          this.output.is_denied = true
        }
        else if (err.code === code.VISITOR_BLACKED) {
          this.output.is_black = true
        }
        // 对客户端来说，统一告知没权限访问
        this.throw(
          code.PERMISSION_DENIED,
          err.message
        )
      }

    }

    async setEmail() {

      const input = this.filter(this.input, {
        email: 'trim',
      })

      this.validate(input, {
        email: 'email',
      })

      const { account } = this.ctx.service

      await account.user.setEmail(input)

    }

    async setMobile() {

      const input = this.filter(this.input, {
        mobile: 'trim',
        verify_code: 'trim',
      })

      this.validate(input, {
        mobile: 'mobile',
        verify_code: 'verify_code',
      })

      const { account } = this.ctx.service

      await account.user.setMobile(input)

    }

    async setPassword() {

      const input = this.filter(this.input, {
        password: 'trim',
        old_password: 'trim',
      })

      this.validate(input, {
        password: 'password',
        old_password: 'password',
      })

      const { account } = this.ctx.service

      await account.user.setPassword(input)

    }

    async resetPassword() {

      const input = this.filter(this.input, {
        mobile: 'trim',
        password: 'trim',
        verify_code: 'trim',
      })

      this.validate(input, {
        mobile: 'mobile',
        password: 'password',
        verify_code: 'verify_code',
      })

      const { account } = this.ctx.service

      await account.user.resetPassword(input)

    }

    async setUserInfo() {

      const input = this.filter(this.input, {
        nickname: 'trim',
        gender: 'number',
        avatar: 'trim',
        domain: 'trim',
        intro: 'trim',
        company: 'trim',
        job: 'trim',
        area_id: 'number',
      })

      this.validate(input, {
        nickname: {
          required: false,
          type: 'string',
          max: limit.USER_NICKNAME_MAX_LENGTH,
          min: limit.USER_NICKNAME_MIN_LENGTH,
        },
        gender: {
          required: false,
          type: 'enum',
          values: [
            limit.USER_GENDER_MALE,
            limit.USER_GENDER_FEMALE,
          ]
        },
        company: {
          required: false,
          allowEmpty: true,
          type: 'string',
          max: limit.CAREER_COMPANY_MAX_LENGTH,
        },
        job: {
          required: false,
          allowEmpty: true,
          type: 'string',
          max: limit.CAREER_JOB_MAX_LENGTH,
        },
      })

      const { account } = this.ctx.service

      await account.userInfo.setUserInfo(input)

      const currentUser = await account.session.getCurrentUser()

      this.output.user =  await account.user.toExternal(currentUser)

    }
  }

  return UserController

}