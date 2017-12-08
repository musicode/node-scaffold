'use strict'

module.exports = app => {

  const { util, limit, config } = app

  class SystemController extends app.BaseController {

    async sync() {

      const { account, relation, privacy } = this.ctx.service

      let currentUser = await account.session.getCurrentUser()

      if (currentUser) {
        currentUser = await account.user.getFullUserById(currentUser.id)
        this.output.user = await account.user.toExternal(currentUser)
      }

      this.output.avatar = {
        male: config.avatar.male,
        female: config.avatar.female,
        group: config.avatar.group,
        anonymous: config.avatar.anonymous,
      }

      if (config.system.signupByInvite) {
        this.output.invite_code = {
          max_count: currentUser ? limit.INVITE_CODE_MAX_COUNT_PER_USER : 0,
        }
      }

    }

    async search() {
      this.output.list = [ ]
      this.output.pager = {
        page: 0,
        page_size: 10,
        total_page: 10,
        count: 100,
      }
    }

  }

  return SystemController

}