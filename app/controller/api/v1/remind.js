'use strict'

module.exports = app => {

  const { util, limit } = app

  class RemindController extends app.BaseController {

    async unreadCount() {

      const { account, relation, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      this.output.question_invite = await trace.invite.getInviteQuestionUnreadRemindCount(currentUser.id)
      this.output.answer_create = await trace.create.getCreateReplyUnreadRemindCount(currentUser.id, true)

      this.output.consult_create = 0

      this.output.comment_create = await trace.create.getCreateConsultUnreadRemindCount(currentUser.id, true)

      this.output.user_follow = 0
      this.output.like = await trace.like.getLikeReplyUnreadRemindCount(currentUser.id)

      this.output.followee = await relation.followee.getFolloweeCount(currentUser.id)
      this.output.follower = await relation.follower.getFollowerCount(currentUser.id)

      this.output.friend_news = 0
    }

  }

  return RemindController

}