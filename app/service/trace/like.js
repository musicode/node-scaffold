
'use strict'

const TYPE_QUESTION = 1
const TYPE_REPLY = 2
const TYPE_DEMAND = 3
const TYPE_CONSULT = 4
const TYPE_POST = 5
const TYPE_COMMENT = 6

const STATUS_ACTIVE = 0
const STATUS_DELETED = 1

module.exports = app => {

  const { code, util, } = app

  class Like extends app.BaseService {

    get tableName() {
      return 'trace_like'
    }

    get fields() {
      return [
        'resource_id', 'resource_type', 'resource_parent_id',
        'creator_id', 'anonymous', 'status',
      ]
    }

    async toExternal(like) {

      const { account, article } = this.service
      const { resource_id, resource_type, resource_parent_id, creator_id } = like

      let type, resource, resourceService
      if (resource_type == TYPE_QUESTION) {
          type = 'question'
      }
      else if (resource_type == TYPE_REPLY) {
          type = 'reply'
      }
      else if (resource_type == TYPE_DEMAND) {
          type = 'demand'
      }
      else if (resource_type == TYPE_CONSULT) {
          type = 'consult'
      }
      else if (resource_type == TYPE_POST) {
          type = 'post'
          resource = await article.post.getPostById(resource_id)
          resource = await article.post.toExternal(resource)
      }
      else if (resource_type == TYPE_COMMENT) {
          type = 'comment'
      }

      let creator = await account.user.getUserById(creator_id)
      creator = await account.user.toExternal(creator)

      return {
          id: like.id,
          type,
          resource,
          creator,
          create_time: like.create_time.getTime()
      }

    }

    /**
     * 点赞
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     */
    async _addLike(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const record = await this.findOneBy({
        resource_id: data.resource_id,
        resource_type: data.resource_type,
        creator_id: currentUser.id,
      })

      if (record) {
        if (record.status === STATUS_ACTIVE) {
          this.throw(
            code.RESOURCE_EXISTS,
            '已点赞，不能再次点赞'
          )
        }
        await this.update(
          {
            status: STATUS_ACTIVE,
          },
          {
            id: record.id,
          }
        )
        return record.id
      }
      else {
        data.creator_id = currentUser.id
        return await this.insert(data)
      }

    }

    /**
     * 取消点赞
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     * @return {Object}
     */
    async _removeLike(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const record = await this.findOneBy({
        resource_id: data.resource_id,
        resource_type: data.resource_type,
        creator_id: currentUser.id,
      })

      if (!record || record.status === STATUS_DELETED) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '未点赞，不能取消点赞'
        )
      }

      await this.update(
        {
          status: STATUS_DELETED,
        },
        {
          id: record.id,
        }
      )

      return record

    }

    /**
     * 点赞文章
     *
     * @param {number|Object} postId
     */
    async likePost(postId) {

      const { account, trace, article } = this.service

      const post = await article.post.checkPostAvailableById(postId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addLike({
            resource_id: post.id,
            resource_type: TYPE_POST,
          })

          let record

          if (util.type(traceId) === 'object') {
            record = traceId
            traceId = record.id
          }
          else {
            record = await this.findOneBy({
              id: traceId,
            })
          }

          await trace.likeRemind.addLikeRemind({
            trace_id: traceId,
            resource_type: record.resource_type,
            sender_id: record.creator_id,
            receiver_id: post.user_id,
          })

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '点赞失败'
        )
      }

      await account.user.increaseUserLikeCount(post.user_id)
      await article.post.increasePostLikeCount(post.id)

    }

    /**
     * 取消点赞文章
     *
     * @param {number|Object} postId
     */
    async unlikePost(postId) {

      const { account, trace, article } = this.service

      const post = await article.post.checkPostAvailableById(postId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeLike({
            resource_id: post.id,
            resource_type: TYPE_POST,
          })

          await trace.likeRemind.removeLikeRemind(record.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消点赞失败'
        )
      }

      await account.user.decreaseUserLikeCount(post.user_id)
      await article.post.decreasePostLikeCount(post.id)

    }

    /**
     * 用户是否已点赞文章
     *
     * @param {number} userId
     * @param {number} postId
     * @return {boolean}
     */
    async hasLikePost(userId, postId) {

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: userId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户点赞文章是否已提醒作者
     *
     * @param {number} userId
     * @param {number} postId
     * @return {boolean}
     */
    async hasLikePostRemind(userId, postId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: userId,
      })

      if (record) {
        return await trace.likeRemind.hasLikeRemind(record.id)
      }

      return false

    }

    /**
     * 读取文章的点赞数
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {number}
     */
    async getLikePostCount(creatorId, postId) {
      const where = {
        resource_type: TYPE_POST,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (postId) {
        where.resource_id = postId
      }
      return await this.countBy(where)
    }

    /**
     * 获取文章的点赞列表
     *
     * @param {number} creatorId
     * @param {number} postId
     * @param {Object} options
     * @return {Array}
     */
    async getLikePostList(creatorId, postId, options) {
      const where = {
        resource_type: TYPE_POST,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (postId) {
        where.resource_id = postId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被点赞文章的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getLikePostRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindList(receiverId, TYPE_POST, options)
    }

    /**
     * 获取用户被点赞文章的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikePostRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindCount(receiverId, TYPE_POST)
    }

    /**
     * 获取用户被点赞文章的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikePostUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.likeRemind.getUnreadLikeRemindCount(receiverId, TYPE_POST)
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readLikePostRemind(receiverId) {
      const { trace } = this.service
      return await trace.likeRemind.readLikeRemind(receiverId, TYPE_POST)
    }

  }
  return Like
}
