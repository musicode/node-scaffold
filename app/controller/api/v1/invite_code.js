'use strict'

module.exports = app => {

  const { util } = app

  class InviteCodeController extends app.BaseController {

    async create() {

      const { account } = this.ctx.service

      const inviteCodeId = await account.inviteCode.createInviteCode()

      this.output.invite_code = await account.inviteCode.getInviteCodeById(inviteCodeId)

    }

    async list() {

      const { account } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const inviteCodeList = await account.inviteCode.getInviteCodeListByUserId(currentUser.id)

      await util.each(
        inviteCodeList,
        async inviteCode => {
          let inviteCodeUsed = await account.inviteCodeUsed.getInviteCodeUsedByInviteCodeId(inviteCode.id)
          if (inviteCodeUsed) {
            let usedInfo = await account.inviteCodeUsed.getUsedInfo(inviteCodeUsed, true)
            Object.assign(inviteCode, usedInfo)
          }
        }
      )

      this.output.list = inviteCodeList

    }

  }

  return InviteCodeController

}