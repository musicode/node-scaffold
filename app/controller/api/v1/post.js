'use strict'

module.exports = app => {

  const { util, limit } = app

  class PostController extends app.BaseController {

    async checkPost() {

      const input = this.filter(this.input, {
        post_id: 'trim',
      })

      this.validate(input, {
        post_id: 'string',
      })

      const { article } = this.ctx.service

      return await article.post.checkPostAvailableByNumber(input.post_id, true)

    }

    async detail() {

      let post = await this.checkPost()

      const { article } = this.ctx.service

      post = await article.post.viewPost(post)

      this.output.post = await article.post.toExternal(post)

    }

    async view() {

      let post = await this.checkPost()

      const { trace } = this.ctx.service

      trace.view.viewPost(post.id)

    }

    async list() {

      const input = this.filter(this.input, {
        user_id: 'number',
        status: 'number',
        content_max_length: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
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
        page: 'number',
        page_size: 'number',
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
      const list = await article.post.getPostList(where, options)
      const count = await article.post.getPostCount(where)

      await util.each(
        list,
        async (item, index) => {
          item = await article.post.toExternal(item)
          if (input.content_max_length > 0) {
            item.content = util.renderSummary(item.content, input.content_max_length)
          }
          list[ index ] = item
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async create() {

      const input = this.filter(this.input, {
        title: 'trim',
        content: 'trim',
        anonymous: 'number',
      })

      this.validate(input, {
        title: {
          type: 'string',
          min: limit.POST_TITLE_MIN_LENGTH,
          max: limit.POST_TITLE_MAX_LENGTH,
        },
        content: {
          type: 'string',
          min: limit.POST_CONTENT_MIN_LENGTH,
          max: limit.POST_CONTENT_MAX_LENGTH,
        },
        anonymous: [
          limit.ANONYMOUS_YES,
          limit.ANONYMOUS_NO
        ]
      })

      const postService = this.ctx.service.article.post

      const postId = await postService.createPost(input)
      const post = await postService.getFullPostById(postId)

      this.output.post = await postService.toExternal(post)

    }

    async update() {

      const input = this.filter(this.input, {
        post_id: 'trim',
        title: 'trim',
        content: 'trim',
        anonymous: 'number',
      })

      this.validate(input, {
        post_id: 'string',
        title: {
          type: 'string',
          min: limit.POST_TITLE_MIN_LENGTH,
          max: limit.POST_TITLE_MAX_LENGTH,
        },
        content: {
          type: 'string',
          min: limit.POST_CONTENT_MIN_LENGTH,
          max: limit.POST_CONTENT_MAX_LENGTH,
        },
        anonymous: [
          limit.ANONYMOUS_YES,
          limit.ANONYMOUS_NO
        ]
      })

      const postService = this.ctx.service.article.post

      const post = await postService.checkPostAvailableByNumber(input.post_id)

      await postService.updatePostById(input, post)

    }

    async delete() {

      let post = await this.checkPost()

      const { article } = this.ctx.service

      await article.post.deletePost(post)

    }

    async follow() {

      let post = await this.checkPost()

      const { trace } = this.ctx.service

      await trace.follow.followPost(post)

    }

    async unfollow() {

      let post = await this.checkPost()

      const { trace } = this.ctx.service

~     await trace.follow.unfollowPost(post)

    }

    async getFollowCount() {

      let post = await this.checkPost()

      const { article } = this.ctx.service

      this.output.count = await article.post.getPostFollowCount(post.id)

    }

    async getFollowList() {

      const input = this.filter(this.input, {
        post_id: 'number',
        user_id: 'number',
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
        page: 'number',
        page_size: 'number',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { account, article, trace } = this.ctx.service

      let postId, userId

      if (input.post_id) {
        const post = await article.post.checkPostAvailableByNumber(input.post_id)
        postId = post.id
      }

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        userId = user.id
      }

      const options = {
        page: input.page,
        page_size: input.page_size,
        sort_order: input.sort_order || 'desc',
        sort_by: input.sort_by || 'update_time'
      }
      const list = await trace.follow.getFollowPostList(userId, postId, options)
      const count = await trace.follow.getFollowPostCount(userId, postId)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await trace.follow.toExternal(item)
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async like() {

      let post = await this.checkPost()

      const { trace } = this.ctx.service

      await trace.like.likePost(post)

    }

    async unlike() {

      let post = await this.checkPost()

      const { trace } = this.ctx.service

      await trace.like.unlikePost(post)

    }

    async getLikeCount() {

      let post = await this.checkPost()

      const { article } = this.ctx.service

      this.output.count = await article.post.getPostLikeCount(post.id)

    }

    async getLikeList() {

      const input = this.filter(this.input, {
        post_id: 'number',
        user_id: 'number',
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
        page: 'number',
        page_size: 'number',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { account, article, trace } = this.ctx.service


      let postId, userId

      if (input.post_id) {
        const post = await article.post.checkPostAvailableByNumber(input.post_id)
        postId = post.id
      }

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        userId = user.id
      }


      const options = {
        page: input.page,
        page_size: input.page_size,
        sort_order: input.sort_order || 'desc',
        sort_by: input.sort_by || 'update_time'
      }
      const list = await trace.like.getLikePostList(userId, postId, options)
      const count = await trace.like.getLikePostCount(userId, postId)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await trace.like.toExternal(item)
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

  }

  return PostController

}