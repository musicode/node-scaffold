'use strict'

module.exports = app => {

  const { util } = app

  class TraceController extends app.BaseController {

    async friend() {

      const { account, relation, privacy } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const friendList = await relation.friend.getFriendList(currentUser.id)
      const blockedIds = await privacy.activityBlocked.getBlockedUserListByUserId(currentUser.id)

      let ids = [ ]

      await util.each(
        friendList,
        async (item, index) => {

          if (blockedIds.indexOf(item.friend_id) < 0) {
            const deniedIds = await privacy.activityDenied.getDeniedUserListByUserId(item.friend_id)
            if (deniedIds.indexOf(currentUser.id) < 0) {
              ids.push(item.friend_id)
            }
          }

        }
      )

      // [TODO] 搜索

    }

  }

  return TraceController

}