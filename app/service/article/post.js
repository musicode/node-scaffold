
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

      eventEmitter.emit(
        eventEmitter.POST_ADD,
        {
          postId: postId
        }
      )

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

      const { account } = this.service

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

      await account.user.decreaseUserWriteCount(post.user_id)

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

      if (!config.postViewByGuest) {
        const currentUser = await account.session.getCurrentUser()
        if (!currentUser) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览文章'
          )
        }
      }

      let post = await this.checkPostAvailableById(postId)
      post = await this.getFullPostById(post)

      await this.increasePostViewCount(post.id)

      post.sub_count = await this.getPostSubCount(post.id)
      post.view_count = await this.getPostViewCount(post.id)
      post.like_count = await this.getPostLikeCount(post.id)
      post.follow_count = await this.getPostFollowCount(post.id)

      return post

    }

    /**
     * 获得文章列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getPostList(where, options) {
      if ('status' in where) {
        if (where.status < 0) {
          delete where.status
        }
      }
      else {
        where.status = [ STATUS_ACTIVE, STATUS_AUDIT_SUCCESS ]
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获得文章数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getPostCount(where) {
      if ('status' in where) {
        if (where.status < 0) {
          delete where.status
        }
      }
      else {
        where.status = [ STATUS_ACTIVE, STATUS_AUDIT_SUCCESS ]
      }
      return await this.countBy(where)
    }


    /**
     * 递增文章的被点赞量
     *
     * @param {number} postId
     */
    async increasePostLikeCount(postId) {
      const key = `post_stat:${postId}`
      const likeCount = await redis.hget(key, 'like_count')
      if (likeCount != null) {
        await redis.hincrby(key, 'like_count', 1)
      }
    }

    /**
     * 递减文章的被点赞量
     *
     * @param {number} postId
     */
    async decreasePostLikeCount(postId) {
      const key = `post_stat:${postId}`
      const likeCount = await redis.hget(key, 'like_count')
      if (likeCount != null) {
        await redis.hincrby(key, 'like_count', -1)
      }
    }

    /**
     * 获取文章的被点赞量
     *
     * @param {number} postId
     */
    async getPostLikeCount(postId) {
      const key = `post_stat:${postId}`
      let likeCount = await redis.hget(key, 'like_count')
      if (likeCount == null) {
        likeCount = await this.service.trace.like.getLikePostCount(null, postId)
        await redis.hset(key, 'like_count', likeCount)
      }
      else {
        likeCount = util.toNumber(likeCount, 0)
      }
      return likeCount
    }

    /**
     * 递增文章的关注量
     *
     * @param {number} postId
     */
    async increasePostFollowCount(postId) {
      const key = `post_stat:${postId}`
      const followCount = await redis.hget(key, 'follow_count')
      if (followCount != null) {
        await redis.hincrby(key, 'follow_count', 1)
      }
    }

    /**
     * 递减文章的关注量
     *
     * @param {number} postId
     */
    async decreasePostFollowCount(postId) {
      const key = `post_stat:${postId}`
      const followCount = await redis.hget(key, 'follow_count')
      if (followCount != null) {
        await redis.hincrby(key, 'follow_count', -1)
      }
    }

    /**
     * 获取文章的关注量
     *
     * @param {number} postId
     */
    async getPostFollowCount(postId) {
      const key = `post_stat:${postId}`
      let followCount = await redis.hget(key, 'follow_count')
      if (followCount == null) {
        followCount = await this.service.trace.follow.getFollowPostCount(null, postId)
        await redis.hset(key, 'follow_count', followCount)
      }
      else {
        followCount = util.toNumber(followCount, 0)
      }
      return followCount
    }

    /**
     * 递增文章的浏览量
     *
     * @param {number} postId
     */
    async increasePostViewCount(postId) {
      // 这里不管有没有，必须递增
      // 因为靠数据库恢复不了
      await redis.hincrby(`post_stat:${postId}`, 'view_count', 1)
    }

    /**
     * 获取文章的浏览量
     *
     * @param {number} postId
     */
    async getPostViewCount(postId) {
      // 这里不管有没有，必须读 redis
      // 因为靠数据库恢复不了
      let viewCount = await redis.hget(`post_stat:${postId}`, 'view_count')
      return util.toNumber(viewCount, 0)
    }

    /**
     * 递增文章的评论量
     *
     * @param {number} postId
     */
    async increasePostSubCount(postId) {
      await redis.hincrby(`post_stat:${postId}`, 'sub_count', 1)
    }

    /**
     * 递减文章的评论量
     *
     * @param {number} postId
     */
    async decreasePostSubCount(postId) {
      await redis.hincrby(`post_stat:${postId}`, 'sub_count', -1)
    }

    /**
     * 获取文章的评论量
     *
     * @param {number} postId
     */
    async getPostSubCount(postId) {
      const subCount = await redis.hget(`post_stat:${postId}`, 'sub_count')
      return util.toNumber(subCount, 0)
    }

  }
  return Post
}
