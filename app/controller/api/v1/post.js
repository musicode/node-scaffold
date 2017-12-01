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

    async list() {

      const input = this.filter(this.input, {
        user_id: 'number',
        status: 'number',
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
        page: 'number',
        page_size: number,
        sort_by: 'sort_by',
        sort_order: 'sort_order',
      })

      const { account, article } = this.ctx.service

      const where = { }

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        where.user_id = user.id
      }

      if (util.type(input.status) === 'number') {
        where.status = input.status
      }

      const options = {
        page: input.page,
        pageSize: input.page_size,
        sortOrder: input.sort_order || 'desc',
        sortBy: input.sort_by || 'create_time'
      }
      const list = await article.post.getPostList(where, options)
      const count = await article.post.getPostCount(where)

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

      await article.post.getPostFollowCount(post.id)

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
        page_size: number,
        sort_by: 'sort_by',
        sort_order: 'sort_order',
      })

      const { account, article, trace } = this.ctx.service

      const post = await article.post.checkPostAvailableByNumber(input.post_id)
      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      const options = {
        page: input.page,
        pageSize: input.page_size,
        sortOrder: input.sort_order || 'desc',
        sortBy: input.sort_by || 'update_time'
      }
      const list = await trace.follow.getFollowPostList(user.id, post.id, options)
      const count = await trace.follow.getFollowPostCount(user.id, post.id)

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

      await article.post.getPostLikeCount(post.id)

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
        page_size: number,
        sort_by: 'sort_by',
        sort_order: 'sort_order',
      })

      const { account, article, trace } = this.ctx.service

      const post = await article.post.checkPostAvailableByNumber(input.post_id)
      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      const options = {
        page: input.page,
        pageSize: input.page_size,
        sortOrder: input.sort_order || 'desc',
        sortBy: input.sort_by || 'update_time'
      }
      const list = await trace.like.getLikePostList(user.id, post.id, options)
      const count = await trace.like.getLikePostCount(user.id, post.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

  }

  return PostController

}