
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

      if (util.type(post.content) !== 'string') {
        post = await this.getFullPostById(post)
      }

      const result = { }
      Object.assign(result, post)

      const { id, number, user_id, anonymous } = result
      delete result.number
      delete result.user_id
      delete result.anonymous

      result.id = number

      result.cover = util.parseCover(result.content)

      const { account, trace } = this.service
      if (anonymous === limit.ANONYMOUS_YES) {
        result.user = account.user.anonymous
      }
      else {
        const user = await account.user.getFullUserById(user_id)
        result.user = await account.user.toExternal(user)
      }

      const currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        result.has_like = await trace.like.hasLikePost(currentUser.id, id)
        result.has_follow = await trace.follow.hasFollowPost(currentUser.id, id)

        if (currentUser.id === user_id) {
          result.can_update = true
          const subCount = await this.getPostSubCount(id)
          result.can_delete = subCount === 0
        }

      }

      result.create_time = result.create_time.getTime()
      result.update_time = result.update_time.getTime()

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
     * 获取 id 获取文章
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
      const postContent = await article.postContent.findOneBy({
        post_id: post.id,
      })

      post.content = postContent.content
      if (postContent.update_time.getTime() > post.update_time.getTime()) {
        post.update_time = postContent.update_time
      }

      post.sub_count = await this.getPostSubCount(post.id)
      post.view_count = await this.getPostViewCount(post.id)
      post.like_count = await this.getPostLikeCount(post.id)
      post.follow_count = await this.getPostFollowCount(post.id)

      return post

    }

    /**
     * 新建文章
     *
     * @param {Object} data
     * @property {string} data.title
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @return {number} 新建的 post id
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

      const { account, article, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const postId = await this.transaction(
        async () => {

          const number = await this.createNumber(limit.POST_NUMBER_LENGTH)
          const anonymous = data.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO
          const postId = await this.insert({
            number,
            title: data.title,
            user_id: currentUser.id,
            anonymous,
          })

          await article.postContent.insert({
            post_id: postId,
            content: data.content,
          })

          await trace.create.createPost(postId, anonymous)

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
          postId,
          service: this.service,
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

      const { account, article, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const post = await this.getPostById(postId)

      if (post.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '没有权限修改该文章'
        )
      }

      let fields = this.getFields(data)

      const { content } = data

      await this.transaction(
        async () => {

          if (fields) {
            if ('anonymous' in fields) {
              fields.anonymous = fields.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO
              if (fields.anonymous === post.anonymous) {
                delete fields.anonymous
              }
            }
            if (Object.keys(fields).length) {
              await this.update(
                fields,
                {
                  id: post.id,
                }
              )
            }
            else {
              fields = null
            }
          }

          if (content) {
            await article.postContent.update(
              {
                content,
              },
              {
                post_id: post.id,
              }
            )
          }

          if (fields && 'anonymous' in fields) {
            await trace.create.createPost(postId, fields.anonymous)
          }

        }
      )

      if (fields && content) {

        await this.updateRedis(`post:${post.id}`, fields)

        eventEmitter.emit(
          eventEmitter.POST_UDPATE,
          {
            postId: post.id,
            service: this.service,
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

      const { account, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const post = await this.getPostById(postId)

      if (post.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '不能删除别人的文章'
        )
      }

      const subCount = await this.getPostSubCount(post.id)
      if (subCount > 0) {
        this.throw(
          code.PERMISSION_DENIED,
          '已有评论的文章不能删除'
        )
      }

      const fields = {
        status: STATUS_DELETED,
      }

      const isSuccess = await this.transaction(
        async () => {

          await this.update(
            fields,
            {
              id: post.id,
            }
          )

          await trace.create.uncreatePost(post.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '删除文章失败'
        )
      }

      await this.updateRedis(`post:${post.id}`, fields)

      await account.user.decreaseUserWriteCount(post.user_id)

      eventEmitter.emit(
        eventEmitter.POST_UDPATE,
        {
          postId: post.id,
          service: this.service,
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

      if (!config.postViewByGuest) {
        const { account } = this.service
        const currentUser = await account.session.getCurrentUser()
        if (!currentUser) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览文章'
          )
        }
      }

      const post = await this.getPostById(postId)

      return await this.getFullPostById(post)

    }

    /**
     * 获得文章列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getPostList(where, options) {
      this._formatWhere(where)
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
      this._formatWhere(where)
      return await this.countBy(where)
    }

    /**
     * 格式化查询条件
     *
     * @param {Object} where
     */
    _formatWhere(where) {
      if ('status' in where) {
        if (where.status < 0) {
          delete where.status
        }
      }
      else {
        where.status = [ STATUS_ACTIVE, STATUS_AUDIT_SUCCESS ]
      }
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
     * @return {number}
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
     * @return {number}
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
      // [TODO]这里不管有没有，必须递增
      // 因为靠数据库恢复不了
      await redis.hincrby(`post_stat:${postId}`, 'view_count', 1)
    }

    /**
     * 获取文章的浏览量
     *
     * @param {number} postId
     * @return {number}
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
      const key = `post_stat:${postId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', 1)
      }
    }

    /**
     * 递减文章的评论量
     *
     * @param {number} postId
     */
    async decreasePostSubCount(postId) {
      const key = `post_stat:${postId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', -1)
      }
    }

    /**
     * 获取文章的评论量
     *
     * @param {number} postId
     * @return {number}
     */
    async getPostSubCount(postId) {
      const key = `post_stat:${postId}`
      let subCount = await redis.hget(key, 'sub_count')
      if (subCount == null) {
        subCount = await this.service.article.comment.getCommentCount({
          post_id: postId,
        })
        await redis.hset(key, 'sub_count', subCount)
      }
      else {
        subCount = util.toNumber(subCount, 0)
      }
      return subCount
    }

  }
  return Post
}
