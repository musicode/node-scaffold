'use strict'

module.exports = app => {
  class InviteCodeUsed extends app.BaseService {

    get tableName() {
      return 'account_invite_code_used'
    }

    get fields() {
      return [
        'user_id', 'invite_code_id',
      ]
    }

    async getUsedInfo(inviteCodeUsed, toExternal) {
      const { account } = this.service
      let user = await account.user.getFullUserById(inviteCodeUsed.user_id)
      if (toExternal) {
        user = await account.user.toExternal(user)
      }
      return {
        used_user: user,
        used_time: inviteCodeUsed.create_time,
      }
    }

    async getInviteCodeUsedByInviteCodeId(inviteCodeId) {
      return await this.findOneBy({
        invite_code_id: inviteCodeId,
      })
    }

  }
  return InviteCodeUsed
}
