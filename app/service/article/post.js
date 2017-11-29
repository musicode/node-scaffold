
'use strict'

const STATUS_ACTIVE = 0
const STATUS_AUDIT_SUCCESS = 1
const STATUS_AUDIT_FAIL = 2
const STATUS_DELETED = 3

module.exports = app => {

  const { code, util, limit, redis, config, eventEmitter } = app

  class Post extends app.BaseService {

    get tableName() {
      return 'article_post'
    }

    get fields() {
      return [
        'number', 'user_id', 'title', 'anonymous', 'status',
      ]
    }

    async toExternal(post) {

      const result = { }
      Object.assign(result, post)

      const { number, user_id } = result
      delete result.number
      delete result.user_id

      result.id = number

      const { account } = this.service
      if (result.anonymous === limit.ANONYMOUS_YES) {
        result.user = account.user.anonymous
      }
      else {
        const user = await account.user.getUserById(user_id)
        result.user = account.user.toExternal(user)
      }

      result.cover = util.parseCover(result.content)

      return result

    }

    /**
     * 检查用户是否存在
     *
     * @param {number} postId
     * @return {Object}
     */
    async checkPostExistedById(postId) {
      const post = await this.findOneBy({
        id: postId,
      })
      if (!post) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '该文章不存在'
        )
      }
      return post
    }

    /**
     * 检查用户是否存在
     *
     * @param {number} postNumber
     * @return {Object}
     */
    async checkPostExistedByNumber(postNumber) {
      const post = await this.findOneBy({
        number: postNumber,
      })
      if (!post) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '该文章不存在'
        )
      }
      return post
    }

    /**
     * 检查文章是否是对外可用状态
     *
     * @param {number|Object} postId
     */
    async checkPostAvailable(postId) {

      let post
      if (postId && postId.id) {
        post = postId
        postId = post.id
      }

      if (!post) {
        post = await this.checkPostExistedById(postId)
      }

      if (post.status === STATUS_ACTIVE
        || post.status === STATUS_AUDIT_SUCCESS
      ) {
        return post
      }

      this.throw(
        code.RESOURCE_NOT_FOUND,
        '该文章不存在'
      )
    }

    /**
     * 获取文章的完整信息
     *
     * @param {number|Object} postId
     * @return {Object}
     */
    async getPostById(postId) {

      // [TODO] update_date 在 redis 的更新
      let post
      if (postId && postId.id) {
        post = postId
        postId = post.id
      }

      const { service } = this.ctx

      const key = `post:${postId}`
      const value = await redis.get(key)

      if (value) {
        post = util.parseObject(value)
      }
      else {
        post = await this.checkPostExistedById(postId)
        redis.set(key, util.stringifyObject(post))
      }

      const postContent = await service.article.postContent.findOneBy({
        post_id: postId,
      })

      post.content = postContent.content

      return post
    }

    /**
     * 通过 number 获取文章的完整信息
     *
     * 因为用户是通过 number 来发送请求的，所以这个接口比较常用
     *
     * @param {number} postNumber
     * @return {Object}
     */
    async getPostByNumber(postNumber) {

      if (!postNumber) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 post number'
        )
      }

      const post = await this.findOneBy({
        number: postNumber,
      })

      if (!post) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '文章不存在'
        )
      }

      return await this.getPostById(post)

    }

    /**
     * 新建文章
     *
     * @param {Object} data
     * @property {string} data.title
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @return {number}
     */
    async createPost(data) {

      const { account, article } = this.service

      const currentUser = await account.session.checkCurrentUser()

      if (!data.title) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 title'
        )
      }
      if (!data.content) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 content'
        )
      }

      const postId = await this.transaction(
        async () => {

          const postId = await this.insert({
            number: util.randomInt(limit.POST_NUMBER_LENGTH),
            title: data.title,
            user_id: currentUser.id,
            anonymous: data.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO,
          })

          data.post_id = postId

          await article.postContent.insert({
            post_id: postId,
            content: data.content,
          })

          return postId

        }
      )

      if (postId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '发布文章失败'
        )
      }

      await redis.hincrby(`user_post:${currentUser.id}`, 'write_count', 1)

      return postId

    }

    /**
     * 修改文章
     *
     * @param {Object} data
     * @property {string} data.title
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @param {number} postId
     */
    async updatePostById(data, postId) {

      const { account, article } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const post = await this.checkPostExistedById(postId)

      if (post.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '没有权限修改该文章'
        )
      }

      let fields = this.getFields(data)
      await this.transaction(
        async () => {

          if (fields) {
            await this.update(
              fields,
              {
                id: postId,
              }
            )
          }

          const { content } = data
          if (content) {

            if (!fields) {
              fields = { }
            }
            fields.content = content

            await article.postContent.update(
              {
                content,
              },
              {
                post_id: postId,
              }
            )
          }

        }
      )

      if (fields) {
        await this.updateRedis(`post:${postId}`, fields)
        eventEmitter.emit(
          eventEmitter.POST_UDPATE,
          {
            postId,
            fields,
          }
        )
      }

    }

    /**
     * 删除文章
     *
     * @param {number} postId
     */
    async deletePost(postId) {

      await this.checkPostAvailable(postId)

      // [TODO] redis 的恢复
      const subCount = await redis.hget(`post_stat:${postId}`, 'sub_count')
      if (subCount > 0) {
        this.throw(
          code.PERMISSION_DENIED,
          '已有评论的文章不能删除'
        )
      }

      const fields = {
        status: STATUS_DELETED,
      }

      await this.update(
        fields,
        {
          id: postId,
        }
      )

      eventEmitter.emit(
        eventEmitter.POST_UDPATE,
        {
          postId,
          fields,
        }
      )

    }

    /**
     * 关注文章
     *
     * @param {number} postId
     */
    async followPost(postId) {

      const { account } = this.service

      await this.checkPostAvailable(postId)

      const currentUser = await account.session.checkCurrentUser()

      await redis.hincrby(`post_stat:${postId}`, 'follow_count', 1)

    }

    /**
     * 取消关注文章
     *
     * @param {number} postId
     */
    async unfollowPost(postId) {

      const { account } = this.service

      await this.checkPostAvailable(postId)

      const currentUser = await account.session.checkCurrentUser()

      await redis.hincrby(`post_stat:${postId}`, 'follow_count', -1)

    }

    /**
     * 点赞文章
     *
     * @param {number} postId
     */
    async likePost(postId) {

      const { account } = this.service

      await this.checkPostAvailable(postId)

      const currentUser = await account.session.checkCurrentUser()

      await redis.hincrby(`post_stat:${postId}`, 'like_count', 1)

    }

    /**
     * 取消点赞文章
     *
     * @param {number} postId
     */
    async unlikePost(postId) {

      const { account } = this.service

      await this.checkPostAvailable(postId)

      const currentUser = await account.session.checkCurrentUser()

      await redis.hincrby(`post_stat:${postId}`, 'like_count', -1)

    }

    /**
     * 浏览文章
     *
     * @param {number} postId
     * @return {Object}
     */
    async viewPost(postId) {

      const { account } = this.service

      const currentUser = await account.session.getCurrentUser()

      await this.checkPostViewAuth(postId, currentUser)

      const post = await this.getPostById(postId)
      const statInfo = await this.getPostStatInfoById(postId)

      Object.assign(post, statInfo)

      return post

    }

    /**
     * 递增文章浏览数
     *
     * @param {number} postId
     */
    async increasePostViewCount(postId) {

      const { account } = this.service

      const currentUser = await account.session.getCurrentUser()

      await this.checkPostViewAuth(postId, currentUser)

      const key = `post_stat:${postId}`
      await redis.hincrby(key, 'view_count', 1)

      const viewCount = await redis.hget(key, 'view_count')

      eventEmitter.emit(
        eventEmitter.POST_UDPATE,
        {
          postId,
          fields: {
            view_count: viewCount,
          }
        }
      )

    }

    /**
     * 文章是否可以被当前登录用户浏览
     *
     * @param {number} postId
     * @param {Object} currentUser
     */
    async checkPostViewAuth(postId, currentUser) {
      if (!currentUser) {
        if (config.postViewByGuest) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览文章'
          )
        }
      }
      await this.checkPostAvailable(postId)
    }

    /**
     * 获取文章的统计数据
     *
     * @param {number} postId
     */
    async getPostStatInfoById(postId) {
      const statInfo = await redis.hgetall(`post_stat:${postId}`)
      return {
        view_count: util.toNumber(statInfo.view_count, 0),
        like_count: util.toNumber(statInfo.like_count, 0),
        follow_count: util.toNumber(statInfo.follow_count, 0),
        sub_count: util.toNumber(statInfo.sub_count, 0),
      }
    }

  }
  return Post
}
