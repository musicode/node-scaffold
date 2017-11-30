
'use strict'

const QUESTION = 1
const DEMAND = 2
const POST = 3
const USER = 4
const REPLY = 5

const STATUS_ACTIVE = 0
const STATUS_DELETED = 1

module.exports = app => {

  const { code, util, redis, } = app

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
        record.status = STATUS_ACTIVE
        await this.update(
          record
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

      record.status = STATUS_DELETED

      await this.update(record)

      return record

    }

    /**
     * 点赞文章
     *
     * @param {number} postId
     */
    async likePost(postId) {

      const { trace, article } = this.service

      const { user_id } = await article.post.checkPostAvailable(postId)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addLike({
            resource_id: postId,
            resource_type: POST,
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
            receiver_id: user_id,
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

      await redis.hincrby(`post_stat:${postId}`, 'like_count', 1)

    }

    /**
     * 取消点赞文章
     *
     * @param {number} postId
     */
    async unlikePost(postId) {

      const { trace } = this.service

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeLike({
            resource_id: postId,
            resource_type: POST,
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

      await redis.hincrby(`post_stat:${postId}`, 'like_count', -1)

    }

    /**
     * 用户是否已点赞文章
     *
     * @param {number} userId
     * @param {number} postId
     */
    async hasLikePost(userId, postId) {

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: POST,
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
     */
    async hasLikePostRemind(userId, postId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: POST,
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
     * @param {number} postId
     * @return {number}
     */
    async getLikePostCount(postId) {
      const count = await redis.hget(`post_stat:${postId}`, 'like_count')
      return util.toNumber(count, 0)
    }





  }
  return Like
}
