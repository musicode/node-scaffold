'use strict'

module.exports = app => {

  const { util } = app

  class PrivacyController extends app.BaseController {

    async setActivityDenied() {

      const input = this.filter(this.input, {
        user_ids: 'trim',
      })

      this.validate(input, {
        user_ids: 'string',
      })

      const { account, privacy } = this.ctx.service

      const userIds = [ ]

      await util.each(
        input.user_ids.split(','),
        async userId => {
          const user = await account.user.getUserByNumber(userId)
          userIds.push(user.id)
        }
      )

      await privacy.activityDenied.setDeniedUserList(userIds)

    }

    async getActivityDenied() {

      const { account, privacy } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const userIds = await privacy.activityDenied.getDeniedUserListByUserId(currentUser.id)

      const userList = [ ]

      await util.each(
        userIds,
        async userId => {
          const user = await account.user.getUserById(userId)
          userList.push(
            account.user.toExternal(user)
          )
        }
      )

      this.output.list = userList

    }

  }

  return PrivacyController

}