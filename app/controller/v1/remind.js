
'use strict'

module.exports = app => {

  const { util, limit } = app

  class RemindController extends app.BaseController {

    async unreadCount() {

      const { account, relation, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      this.output.question_invite = await trace.invite.getInviteQuestionUnreadRemindCount(currentUser.id)
      this.output.answer_create = await trace.create.getCreateAnswerUnreadRemindCount(currentUser.id)

      this.output.consult_create = await trace.create.getCreateConsultUnreadRemindCount(currentUser.id)

      const sql = 'SELECT COUNT(*) as count FROM ?? WHERE receiver_id = ? AND status = ? AND '
              + '(resource_type = ? OR (resource_type = ? AND resource_parent_id != 0))'

      const record = await trace.createRemind.queryOne(
        sql,
        [
          trace.createRemind.tableName, currentUser.id, trace.createRemind.STATUS_UNREAD,
          trace.create.TYPE_COMMENT, trace.create.TYPE_REPLY
        ]
      )

      this.output.comment_create = record.count

      this.output.user_follow = await trace.follow.getFollowUserUnreadRemindCount(currentUser.id)
      this.output.user_view = await trace.view.getViewUserUnreadRemindCount(currentUser.id)

      this.output.like = await trace.like.getLikeUnreadRemindCount(currentUser.id)

      this.output.followee = await relation.followee.getFolloweeCount(currentUser.id)
      this.output.follower = await relation.follower.getFollowerCount(currentUser.id)

      this.output.friend_news = 0
    }

    async userViewList() {

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

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const list = await trace.view.getViewUserRemindList(currentUser.id, input)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await trace.remind.toExternal(item)
        }
      )

      const count = await trace.view.getViewUserRemindCount(currentUser.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async userViewRead() {

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      await trace.view.readViewUserRemind(currentUser.id)

    }


    async likeList() {

      const input = this.filter(this.input, {
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
        content_max_length: 'number',
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
          type: 'sort_order',
        },
        content_max_length: {
          required: false,
          type: 'number',
        }
      })

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const list = await trace.like.getLikeRemindList(currentUser.id, input)

      await util.each(
        list,
        async (item, index) => {
          item = await trace.remind.toExternal(item)
          if (item.resource.content && input.content_max_length > 0) {
            item.resource.content = util.renderSummary(item.resource.content, input.content_max_length)
          }
          list[ index ] = item
        }
      )

      const count = await trace.like.getLikeRemindCount(currentUser.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async likeRead() {

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      await trace.like.readLikeRemind(currentUser.id)

    }

    async userFollowRead() {

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      await trace.follow.readFollowUserRemind(currentUser.id)

    }

    async questionInviteList() {

      const input = this.filter(this.input, {
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
        content_max_length: 'number',
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
          type: 'sort_order',
        },
        content_max_length: {
          required: false,
          type: 'number',
        }
      })

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const list = await trace.invite.getInviteQuestionRemindList(currentUser.id, input)

      await util.each(
        list,
        async (item, index) => {
          item = await trace.remind.toExternal(item)
          if (item.resource.content && input.content_max_length > 0) {
            item.resource.content = util.renderSummary(item.resource.content, input.content_max_length)
          }
          list[ index ] = item
        }
      )

      const count = await trace.invite.getInviteQuestionRemindCount(currentUser.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async questionInviteRead() {

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      await trace.invite.readInviteQuestionRemind(currentUser.id)

    }

    async answerCreateList() {

      const input = this.filter(this.input, {
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
        content_max_length: 'number',
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
          type: 'sort_order',
        },
        content_max_length: {
          required: false,
          type: 'number',
        }
      })

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const list = await trace.create.getCreateAnswerRemindList(currentUser.id, input)

      await util.each(
        list,
        async (item, index) => {
          item = await trace.remind.toExternal(item)
          if (item.resource.content && input.content_max_length > 0) {
            item.resource.content = util.renderSummary(item.resource.content, input.content_max_length)
          }
          list[ index ] = item
        }
      )

      const count = await trace.create.getCreateAnswerRemindCount(currentUser.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async answerCreateRead() {

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      await trace.create.readCreateAnswerRemind(currentUser.id)

    }



    async consultCreateList() {

      const input = this.filter(this.input, {
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
        content_max_length: 'number',
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
          type: 'sort_order',
        },
        content_max_length: {
          required: false,
          type: 'number',
        }
      })

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const list = await trace.create.getCreateConsultRemindList(currentUser.id, input)

      await util.each(
        list,
        async (item, index) => {
          item = await trace.remind.toExternal(item)
          if (item.resource.content && input.content_max_length > 0) {
            item.resource.content = util.renderSummary(item.resource.content, input.content_max_length)
          }
          list[ index ] = item
        }
      )

      const count = await trace.create.getCreateConsultRemindCount(currentUser.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async consultCreateRead() {

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      await trace.create.readCreateConsultRemind(currentUser.id)

    }


    async commentCreateList() {

      const input = this.filter(this.input, {
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
        content_max_length: 'number',
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
          type: 'sort_order',
        },
        content_max_length: {
          required: false,
          type: 'number',
        }
      })

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const whereSql = ' FROM ?? WHERE receiver_id = ? AND status != ? AND '
        + '(resource_type = ? OR (resource_type = ? AND resource_parent_id != 0))'

      const originalValues = [
        trace.createRemind.tableName, currentUser.id, trace.createRemind.STATUS_DELETED,
        trace.create.TYPE_COMMENT, trace.create.TYPE_REPLY
      ]

      let sql = 'SELECT * count' + whereSql
      let values = Array.from(originalValues)

      const sorter = util.formatSorter(input.er_by, input.er_order)
      if (sorter) {
        sql += ' ' + sorter.sql
        util.pushArray(values, sorter.values)
      }

      const pager = util.formatPager(input.page, input.page_size)
      sql += ' ' + pager.sql
      util.pushArray(values, pager.values)

      const list = await trace.createRemind.query(sql, values)

      await util.each(
        list,
        async (item, index) => {
          item = await trace.remind.toExternal(item)
          if (item.resource.content && input.content_max_length > 0) {
            item.resource.content = util.renderSummary(item.resource.content, input.content_max_length)
          }
          list[ index ] = item
        }
      )


      sql = 'SELECT COUNT(*) as count' + whereSql
      const record = await trace.createRemind.queryOne(sql, originalValues)

      this.output.list = list
      this.output.pager = this.createPager(input, record.count)

    }

    async commentCreateRead() {

      const { account, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const sql = 'UPDATE ?? SET `status` = ? WHERE receiver_id = ? AND status = ? AND '
      + '(resource_type = ? OR (resource_type = ? AND resource_parent_id != 0))'

      await trace.createRemind.query(
        sql,
        [
          trace.createRemind.tableName, trace.createRemind.STATUS_RAEDED, currentUser.id,
          trace.createRemind.STATUS_UNREAD, trace.create.TYPE_COMMENT, trace.create.TYPE_REPLY
        ]
      )

    }

  }



  return RemindController

}