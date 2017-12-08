'use strict'

module.exports = app => {

  const { util, limit } = app

  class ReplyController extends app.BaseController {

    async checkReply() {

      const input = this.filter(this.input, {
        reply_id: 'trim',
      })

      this.validate(input, {
        reply_id: 'string',
      })

      const { qa } = this.ctx.service

      return await qa.reply.checkReplyAvailableByNumber(input.reply_id, true)

    }

    async detail() {

      let reply = await this.checkReply()

      const { qa } = this.ctx.service

      reply = await qa.reply.viewReply(reply)

      const question = await qa.question.viewQuestion(reply.question_id)

      this.output.reply = await qa.reply.toExternal(reply)
      this.output.question = await qa.question.toExternal(question)

    }

    async list() {

      const input = this.filter(this.input, {
        question_id: 'number',
        user_id: 'number',
        status: 'number',
        content_max_length: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        question_id: {
          required: false,
          type: 'number'
        },
        user_id: {
          required: false,
          type: 'number'
        },
        status: {
          required: false,
          type: 'number'
        },
        content_max_length: {
          required: false,
          type: 'number'
        },
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

      const { account, qa } = this.ctx.service
      const currentUser = await account.session.getCurrentUser()

      const where = { }
      let anonymousVisible = true

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        where.user_id = user.id

        if (!currentUser || currentUser.id !== user.id) {
          anonymousVisible = false
        }
      }

      if (input.question_id) {
        const question = await qa.question.checkQuestionAvailableByNumber(input.question_id)
        where.question_id = question.id
      }

      if (util.type(input.status) === 'number') {
        where.status = input.status
      }

      if (!anonymousVisible) {
        where.anonymous = limit.ANONYMOUS_NO
      }

      const options = {
        page: input.page,
        page_size: input.page_size,
        sort_order: input.sort_order || 'desc',
        sort_by: input.sort_by || 'create_time'
      }
      const list = await qa.reply.getReplyList(where, options)
      const count = await qa.reply.getReplyCount(where)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await qa.reply.toExternal(item)
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async create() {

      const input = this.filter(this.input, {
        question_id: 'number',
        parent_id: 'number',
        content: 'trim',
        anonymous: 'number',
      })

      this.validate(input, {
        question_id: 'number',
        parent_id: {
          required: false,
          type: 'number',
        },
        content: {
          type: 'string',
          max: limit.REPLY_CONTENT_MAX_LENGTH,
        },
        anonymous: [
          limit.ANONYMOUS_YES,
          limit.ANONYMOUS_NO,
        ]
      })

      const { qa } = this.ctx.service

      const question = await qa.question.checkQuestionAvailableByNumber(input.question_id)
      input.question_id = question.id

      if (input.parent_id) {
        const reply = await qa.reply.checkReplyAvailableByNumber(input.parent_id)
        input.parent_id = reply.id
      }

      const replyId = await qa.reply.createReply(input)
      const reply = await qa.reply.getFullReplyById(replyId)

      this.output.reply = await qa.reply.toExternal(reply)

    }

    async update() {

      const input = this.filter(this.input, {
        reply_id: 'trim',
        content: 'trim',
        anonymous: 'number',
      })

      this.validate(input, {
        reply_id: 'string',
        content: {
          type: 'string',
          max: limit.REPLY_CONTENT_MAX_LENGTH,
        },
        anonymous: [
          limit.ANONYMOUS_YES,
          limit.ANONYMOUS_NO,
        ]
      })

      const replyService = this.ctx.service.qa.reply

      const reply = await replyService.checkReplyAvailableByNumber(input.reply_id)

      await replyService.updateReplyById(input, reply)

    }

    async delete() {

      const reply = await this.checkReply()

      const { qa } = this.ctx.service

      await qa.reply.deleteReply(reply)

    }

  }

  return ReplyController

}