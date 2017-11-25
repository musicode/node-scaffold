'use strict'

module.exports = app => {

  const { limit, config } = app

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
      const user = await account.user.getUserById(input.user_id)



    }

    async view() {

      const input = this.filter(this.input, {
        user_id: ['trim', 'number'],
      })

      this.validate(input, {
        user_id: {
          type: 'number',
        }
      })

      const { account } = this.ctx.service

      account.user.view(input.user_id)

    }

    async update() {

      const input = this.filter(this.input, {
        nickname: 'trim',
        gender: 'number',
        avatar: 'trim',
        domain: ['trim', 'lower'],
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
      const currentUser = await account.session.checkCurrentUser()

      await account.userInfo.setUserInfoByUserId(input, currentUser.id)

    }
  }

  return UserController

}