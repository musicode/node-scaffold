'use strict'

module.exports = app => {

  const { util } = app

  class PrivacyController extends app.BaseController {

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

    async setActivityDenied() {

      const input = this.filter(this.input, {
        user_ids: 'array',
      })

      this.validate(input, {
        user_ids: 'array',
      })

      const { account, privacy } = this.ctx.service

      const userIds = [ ]

      await util.each(
        input.user_ids,
        async userId => {
          const user = await account.user.checkUserAvailableByNumber(userId)
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
          let user = await account.user.getFullUserById(userId)
          user = await account.user.toExternal(user)
          userList.push(user)
        }
      )

      this.output.list = userList

    }

    async setActivityBlocked() {

      const input = this.filter(this.input, {
        user_ids: 'array',
      })

      this.validate(input, {
        user_ids: 'array',
      })

      const { account, privacy } = this.ctx.service

      const userIds = [ ]

      await util.each(
        input.user_ids,
        async userId => {
          const user = await account.user.checkUserAvailableByNumber(userId)
          userIds.push(user.id)
        }
      )

      await privacy.activityBlocked.setBlockedUserList(userIds)

    }

    async getActivityBlocked() {

      const { account, privacy } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const userIds = await privacy.activityBlocked.getBlockedUserListByUserId(currentUser.id)

      const userList = [ ]

      await util.each(
        userIds,
        async userId => {
          let user = await account.user.getFullUserById(userId)
          user = await account.user.toExternal(user)
          userList.push(user)
        }
      )

      this.output.list = userList

    }

    async addToBlacklist() {

      const input = this.filter(this.input, {
        user_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
      })

      const { account, privacy } = this.ctx.service

      const user = await account.user.checkUserAvailableByNumber(input.user_id)

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

      const user = await account.user.checkUserAvailableByNumber(input.user_id)

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

      const user = await account.user.checkUserAvailableByNumber(input.user_id)
      const currentUser = await account.session.checkCurrentUser()

      this.output.has_blacked = await privacy.blacklist.hasBlacked(currentUser.id, user.id)

    }

    async setBlacklist() {

      const input = this.filter(this.input, {
        user_ids: 'array',
      })

      this.validate(input, {
        user_ids: 'array',
      })

      const { account, privacy } = this.ctx.service

      const userIds = [ ]

      await util.each(
        input.user_ids,
        async userId => {
          const user = await account.user.checkUserAvailableByNumber(userId)
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
          let user = await account.user.getFullUserById(userId)
          user = await account.user.toExternal(user)
          userList.push(user)
        }
      )

      this.output.list = userList

    }



  }

  return PrivacyController

}