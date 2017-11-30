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

      return await article.post.checkPostExistedByNumber(input.post_id)

    }

    async detail() {

      let post = await this.checkPost()

      const { article } = this.ctx.service

      post = await article.post.viewPost(post.id)

      this.output.post = await article.post.toExternal(post)

    }

    async view() {

      let post = await this.checkPost()

      const { article } = this.ctx.service

      await article.post.increasePostViewCount(post.id)

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
      const post = await postService.getPostById(postId)

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

      const post = await postService.checkPostExistedByNumber(input.post_id)

      await postService.updatePostById(input, post.id)

    }

    async delete() {

      let post = await this.checkPost()

      const { article } = this.ctx.service

      await article.post.deletePost(post.id)

    }

    async follow() {

      let post = await this.checkPost()

      const { article } = this.ctx.service

      await article.post.followPost(post.id)

    }

    async unfollow() {

      let post = await this.checkPost()

      const { article } = this.ctx.service

      await article.post.unfollowPost(post.id)

    }

    async like() {

      let post = await this.checkPost()

      const { trace } = this.ctx.service

      await trace.like.likePost(post.id)

    }

    async unlike() {

      let post = await this.checkPost()

      const { trace } = this.ctx.service

      await trace.like.unlikePost(post.id)

    }

    async getLikeCount() {

      let post = await this.checkPost()

      const { trace } = this.ctx.service

      await trace.like.getLikePostCount(post.id)

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
        sort_order: {
          required: false,
          type: 'string'
        },
        sort_by: {
          required: false,
          type: 'string'
        }
      })

      const { account, article, trace } = this.ctx.service

      const post = await article.post.checkPostExistedByNumber(input.post_id)
      const user = await account.user.checkUserExistedByNumber(input.user_id)

      await article.post.checkPostAvailable(post)

      const options = {
        page: input.page,
        pageSize: input.pageSize,
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