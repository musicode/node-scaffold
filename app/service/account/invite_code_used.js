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
      const user = await account.user.getUserById(inviteCodeUsed.user_id)
      return {
        used_user: toExternal ? account.user.toExternal(user) : user,
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
