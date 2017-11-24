'use strict'

module.exports = app => {

  const { code, moment } = app

  class InviteCode extends app.BaseService {

    get tableName() {
      return 'account_invite_code'
    }

    get fields() {
      return [
        'user_id', 'invite_code',
      ]
    }

    async checkAvailable(inviteCode) {

      const result = await this.findOneBy({
        invite_code: inviteCode,
      })

      const { PARAM_INVALID } = code

      if (!result) {
        this.throw(
          PARAM_INVALID,
          '邀请码不存在'
        )
      }

      const passedTime = Date.now() - result.create_time.getTime()
      const expiredTime =  app.limit.INVITE_CODE_MAX_AGE_BY_MONTH * moment.MONTH
      if (passedTime > expiredTime) {
        this.throw(
          PARAM_INVALID,
          '邀请码不存在'
        )
      }

      const inviteCodeUsed = await this.service.account.inviteCodeUsed.findOneBy({
        invite_code_id: inviteCode.id,
      })
      if (inviteCodeUsed) {
        this.throw(
          PARAM_INVALID,
          '邀请码已被使用'
        )
      }

      return result

    }

  }
  return InviteCode
}
