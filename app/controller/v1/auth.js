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
        nickname: 'nickname',
        gender: 'gender',
        company: {
          required: false,
          empty: true,
          type: 'career_company',
        },
        job: {
          required: false,
          empty: true,
          type: 'career_job',
        },
        mobile: 'mobile',
        password: 'password',
        verify_code: 'verify_code'
      }

      if (config.system.signupByInvite) {
        rules.invite_code = 'invite_code'
      }

      this.validate(input, rules)

      const userService = this.ctx.service.account.user
      const userId = await userService.signup(input)

      const result = await userService.getFullUserById(userId)
      this.output.user = await userService.toExternal(result)

    }

    async signin() {

      const input = this.filter(this.input, {
        username: 'trim',
        password: 'trim',
      })

      this.validate(input, {
        username: 'mobile',
        password: 'password',
      })

      const userService = this.ctx.service.account.user
      const user =  await userService.signin({
        mobile: input.username,
        password: input.password,
      })

      const result = await userService.getFullUserById(user)
      this.output.user = await userService.toExternal(result)

    }

    async signout() {
      await this.ctx.service.account.user.signout()
    }

  }

  return AuthController

}
