'use strict'

module.exports = app => {

  const { util, limit, config } = app

  class SystemController extends app.BaseController {

    async sync() {

      const { account, relation, privacy } = this.ctx.service

      const currentUser = await account.session.getCurrentUser()

      if (currentUser) {
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

  }

  return SystemController

}