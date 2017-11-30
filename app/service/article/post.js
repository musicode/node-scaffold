
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
     * 检查文章是否是对外可用状态
     *
     * @param {number|Object} postId 文章 id
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkPostAvailableById(postId, checkStatus) {

      let post
      if (postId && postId.id) {
        post = postId
        postId = post.id
      }

      if (!post && postId) {
        post = await this.getPostById(postId)
      }

      if (post
        && (!checkStatus
        || post.status === STATUS_ACTIVE
        || post.status === STATUS_AUDIT_SUCCESS)
      ) {
        return post
      }

      this.throw(
        code.RESOURCE_NOT_FOUND,
        '该文章不存在'
      )

    }

    /**
     * 检查文章是否是对外可用状态
     *
     * @param {number} commentNumber 文章 number
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkPostAvailableByNumber(postNumber, checkStatus) {

      const post = await this.findOneBy({
        number: postNumber,
      })

      return await this.checkPostAvailableById(post, checkStatus)

    }

    /**
     * 获取文章
     *
     * @param {number|Object} postId
     * @return {Object}
     */
    async getPostById(postId) {

      let post
      if (postId && postId.id) {
        post = postId
        postId = post.id
      }

      if (!post) {
        const key = `post:${postId}`
        const value = await redis.get(key)

        if (value) {
          post = util.parseObject(value)
        }
        else {
          post = await this.findOneBy({ id: postId })
          await redis.set(key, util.stringifyObject(post))
        }
      }

      return post
    }

    /**
     * 获取文章的完整信息
     *
     * @param {number|Object} postId
     * @return {Object}
     */
    async getFullPostById(postId) {

      const { article } = this.ctx.service

      const post = await this.getPostById(postId)
      const record = await article.postContent.findOneBy({
        post_id: post.id,
      })

      post.content = record.content
      if (record.update_time.getTime() > post.update_time.getTime()) {
        post.update_time = record.update_time
      }

      return post

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

      const { account, article } = this.service

      const currentUser = await account.session.checkCurrentUser()

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
          '新增文章失败'
        )
      }

      await account.user.increaseUserWriteCount(currentUser.id)

      return postId

    }

    /**
     * 修改文章
     *
     * @param {Object} data
     * @property {string} data.title
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @param {number|Object} postId
     */
    async updatePostById(data, postId) {

      const { account, article } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const post = await this.checkPostAvailableById(postId)

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
                id: post.id,
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
                post_id: post.id,
              }
            )
          }

        }
      )

      if (fields) {

        const cache = { }
        Object.assign(cache, fields)

        if ('content' in cache) {
          delete cache.content
        }

        await this.updateRedis(`post:${post.id}`, cache)

        eventEmitter.emit(
          eventEmitter.POST_UDPATE,
          {
            postId: post.id,
            fields,
          }
        )
      }

    }

    /**
     * 删除文章
     *
     * @param {number|Object} postId
     */
    async deletePost(postId) {

      const post = await this.checkPostAvailableById(postId)

      // [TODO] redis 的恢复
      const subCount = await redis.hget(`post_stat:${post.id}`, 'sub_count')
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
          id: post.id,
        }
      )

      await this.updateRedis(`post:${post.id}`, fields)

      eventEmitter.emit(
        eventEmitter.POST_UDPATE,
        {
          postId: post.id,
          fields,
        }
      )

    }

    /**
     * 浏览文章
     *
     * @param {number|Object} postId
     * @return {Object}
     */
    async viewPost(postId) {

      const { account } = this.service

      const currentUser = await account.session.getCurrentUser()

      const post = await this.checkPostViewAuth(postId, currentUser)

      const statInfo = await this.getPostStatInfoById(post.id)

      Object.assign(post, statInfo)

      return post

    }

    /**
     * 递增文章浏览数
     *
     * @param {number|Object} postId
     */
    async increasePostViewCount(postId) {

      const { account } = this.service

      const currentUser = await account.session.getCurrentUser()

      const post = await this.checkPostViewAuth(postId, currentUser)

      const key = `post_stat:${post.id}`
      await redis.hincrby(key, 'view_count', 1)

      const viewCount = await redis.hget(key, 'view_count')

      eventEmitter.emit(
        eventEmitter.POST_UDPATE,
        {
          postId: post.id,
          fields: {
            view_count: viewCount,
          }
        }
      )

    }

    /**
     * 文章是否可以被当前登录用户浏览
     *
     * @param {number|Object} postId
     * @param {Object} currentUser
     * @return {Object}
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
      return await this.checkPostAvailableById(postId)
    }

    async increasePostLikeCount(postId) {
      await redis.hincrby(`post_stat:${postId}`, 'like_count', 1)
    }

    async decreasePostLikeCount(postId) {
      await redis.hincrby(`post_stat:${postId}`, 'like_count', -1)
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
