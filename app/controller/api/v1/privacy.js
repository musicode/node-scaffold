'use strict'

// [TODO] user_ids 传递的参数需要数组化

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

    async setProfileAllowed() {

      const input = this.filter(this.input, {
        allowed_type: 'number',
      })

      this.validate(input, {
        allowed_type: 'number',
      })

      const { privacy } = this.ctx.service

      await privacy.profileAllowed.setAllowedType(input.allowed_type)

    }

    async getProfileAllowed() {

      const { account, privacy } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      this.output.allowed_type = await privacy.profileAllowed.getAllowedTypeByUserId(currentUser.id)

    }

    async addToBlacklist() {

      const input = this.filter(this.input, {
        user_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
      })

      const { account, privacy } = this.ctx.service

      const user = await account.user.getUserByNumber(input.user_id)

      await privacy.blacklist.addUserToBlacklist(user.id)

    }

    async removeFromBlacklist() {

      const input = this.filter(this.input, {
        user_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
      })

      const { account, privacy } = this.ctx.service

      const user = await account.user.getUserByNumber(input.user_id)

      await privacy.blacklist.removeUserFromBlacklist(user.id)

    }

    async hasBlacked() {

      const input = this.filter(this.input, {
        user_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
      })

      const { account, privacy } = this.ctx.service

      const user = await account.user.getUserByNumber(input.user_id)
      const currentUser = await account.session.checkCurrentUser()

      this.output.has_blacked = await privacy.blacklist.hasBlacked(currentUser.id, user.id)

    }

    async setBlacklist() {

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

      await privacy.blacklist.setBlacklist(userIds)

    }

    async getBlacklist() {

      const { account, privacy } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const userIds = await privacy.blacklist.getBlacklistByUserId(currentUser.id)

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