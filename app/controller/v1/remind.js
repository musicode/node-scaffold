
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

    async viewList() {

      const input = this.filter(this.input, {
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { account, relation, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const list = await trace.view.getViewUserRemindList(currentUser.id, {
        page: input.page,
        page_size: input.page_size,
        sort_by: 'update_time',
        sort_order: 'desc',
      })

      const count = await trace.view.getViewUserRemindCount(currentUser.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

  }

  return RemindController

}