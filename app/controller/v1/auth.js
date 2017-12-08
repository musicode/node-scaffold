'use strict'

module.exports = app => {

  const { limit, config } = app

  class AuthController extends app.BaseController {

    async signup() {

      const input = this.filter(this.input, {
        nickname: 'trim',
        gender: 'number',
        company: 'trim',
        job: 'trim',
        mobile: 'trim',
        password: 'trim',
        verify_code: 'trim',
        invite_code: 'trim',
      })

      const rules = {
        nickname: {
          type: 'string',
          max: limit.USER_NICKNAME_MAX_LENGTH,
          min: limit.USER_NICKNAME_MIN_LENGTH,
        },
        gender: [
          limit.USER_GENDER_MALE,
          limit.USER_GENDER_FEMALE,
        ],
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
        mobile: 'mobile',
        password: {
          type: 'string',
          max: limit.USER_PASSWORD_MAX_LENGTH,
          min: limit.USER_PASSWORD_MIN_LENGTH,
        },
        verify_code: 'verify_code'
      }

      if (config.system.signupByInvite) {
        rules.invite_code = 'string'
      }

      this.validate(input, rules)

      const userService = this.ctx.service.account.user
      const userId = await userService.signup(input)

      const result = await userService.getUserById(userId)
      this.output.user = userService.toExternal(result)

    }

    async signin() {

      const input = this.filter(this.input, {
        username: 'trim',
        password: ['trim', 'lower'],
      })

      this.validate(input, {
        username: 'mobile',
        password: 'string',
      })

      const userService = this.ctx.service.account.user
      const user =  await userService.signin({
        mobile: input.username,
        password: input.password,
      })

      const result = await userService.getUserById(user)
      this.output.user = userService.toExternal(result)

    }

    async signout() {
      await this.ctx.service.account.user.signout()
    }

  }

  return AuthController

}
