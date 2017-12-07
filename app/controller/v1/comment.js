'use strict'

module.exports = app => {

  const { util, limit } = app

  class CommentController extends app.BaseController {

    async checkComment() {

      const input = this.filter(this.input, {
        comment_id: 'trim',
      })

      this.validate(input, {
        comment_id: 'string',
      })

      const { article } = this.ctx.service

      return await article.comment.checkCommentAvailableByNumber(input.comment_id, true)

    }

    async detail() {

      let comment = await this.checkComment()

      const { article } = this.ctx.service

      comment = await article.comment.viewComment(comment)

      this.output.comment = await article.comment.toExternal(comment)

    }

    async list() {

      const input = this.filter(this.input, {
        post_id: 'number',
        user_id: 'number',
        status: 'number',
        content_max_length: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        post_id: {
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

      const { account, article } = this.ctx.service
      const currentUser = await account.session.getCurrentUser()

      const where = { }
      let anonymousVisible

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        where.user_id = user.id

        if (currentUser && currentUser.id === user.id) {
          anonymousVisible = true
        }
      }

      if (input.post_id) {
        const post = await article.post.checkPostAvailableByNumber(input.post_id)
        where.post_id = post.id
      }

      if (util.type(input.status) === 'number') {
        where.status = input.status
      }

      if (!anonymousVisible) {
        where.anonymous = limit.ANONYMOUSE_NO
      }

      const options = {
        page: input.page,
        page_size: input.page_size,
        sort_order: input.sort_order || 'desc',
        sort_by: input.sort_by || 'create_time'
      }
      const list = await article.comment.getCommentList(where, options)
      const count = await article.comment.getCommentCount(where)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await article.comment.toExternal(item)
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async create() {

      const input = this.filter(this.input, {
        post_id: 'number',
        parent_id: 'number',
        content: 'trim',
        anonymous: 'number',
      })

      this.validate(input, {
        post_id: 'number',
        parent_id: {
          required: false,
          type: 'number',
        },
        content: {
          type: 'string',
          max: limit.COMMENT_CONTENT_MAX_LENGTH,
        },
        anonymous: [
          limit.ANONYMOUS_YES,
          limit.ANONYMOUS_NO,
        ]
      })

      const { article } = this.ctx.service

      const post = await article.post.checkPostAvailableByNumber(input.post_id)
      input.post_id = post.id

      if (input.parent_id) {
        const comment = await article.comment.checkCommentAvailableByNumber(input.parent_id)
        input.parent_id = comment.id
      }

      const commentId = await article.comment.createComment(input)
      const comment = await article.comment.getFullCommentById(commentId)

      this.output.comment = await article.comment.toExternal(comment)

    }

    async update() {

      const input = this.filter(this.input, {
        comment_id: 'trim',
        content: 'trim',
        anonymous: 'number',
      })

      this.validate(input, {
        comment_id: 'string',
        content: {
          type: 'string',
          max: limit.COMMENT_CONTENT_MAX_LENGTH,
        },
        anonymous: [
          limit.ANONYMOUS_YES,
          limit.ANONYMOUS_NO,
        ]
      })

      const commentService = this.ctx.service.article.comment

      const comment = await commentService.checkCommentAvailableByNumber(input.comment_id)

      await commentService.updateCommentById(input, comment)

    }

    async delete() {

      const comment = await this.checkComment()

      const { article } = this.ctx.service

      await article.comment.deleteComment(comment)

    }

  }

  return CommentController

}