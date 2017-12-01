
'use strict'

const TYPE_QUESTION = 1
const TYPE_DEMAND = 2
const TYPE_POST = 3
const TYPE_USER = 4

const STATUS_ACTIVE = 0
const STATUS_DELETED = 1

module.exports = app => {

  const { code, util, } = app

  class View extends app.BaseService {

    get tableName() {
      return 'trace_view'
    }

    get fields() {
      return [
        'resource_id', 'resource_type',
        'creator_id', 'anonymous', 'status',
      ]
    }

    /**
     * 浏览
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     */
    async _addView(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const record = await this.findOneBy({
        resource_id: data.resource_id,
        resource_type: data.resource_type,
        creator_id: currentUser.id,
      })

      if (record) {
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
     * 取消浏览
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     * @return {Object}
     */
    async _removeView(data) {

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
          '未浏览，不能取消浏览'
        )
      }

      record.status = STATUS_DELETED

      await this.update(record)

      return record

    }

    /**
     * 浏览文章
     *
     * @param {number|Object} postId
     */
    async viewPost(postId) {

      const { account, trace, article } = this.service

      const post = await article.post.checkPostAvailableById(postId)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addView({
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

          await trace.viewRemind.addViewRemind({
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
          '浏览失败'
        )
      }

      await article.post.increasePostViewCount(post.id)

    }

    /**
     * 取消浏览文章
     *
     * @param {number|Object} postId
     */
    async unviewPost(postId) {

      const { account, trace, article } = this.service

      const post = await article.post.checkPostAvailableById(postId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeView({
            resource_id: post.id,
            resource_type: TYPE_POST,
          })

          await trace.viewRemind.removeViewRemind(record.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消浏览失败'
        )
      }

      await article.post.decreasePostViewCount(post.id)

    }

    /**
     * 用户是否已浏览文章
     *
     * @param {number} userId
     * @param {number} postId
     * @return {boolean}
     */
    async hasViewPost(userId, postId) {

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: userId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户浏览文章是否已提醒作者
     *
     * @param {number} userId
     * @param {number} postId
     * @return {boolean}
     */
    async hasViewPostRemind(userId, postId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: userId,
      })

      if (record) {
        return await trace.viewRemind.hasViewRemind(record.id)
      }

      return false

    }

    /**
     * 读取文章的浏览数
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {number}
     */
    async getViewPostCount(creatorId, postId) {
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
     * 获取文章的浏览列表
     *
     * @param {number} creatorId
     * @param {number} postId
     * @param {Object} options
     * @return {Array}
     */
    async getViewPostList(creatorId, postId, options) {
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
     * 获取用户被浏览文章的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getViewPostRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindList(receiverId, TYPE_POST, options)
    }

    /**
     * 获取用户被浏览文章的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewPostRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindCount(receiverId, TYPE_POST)
    }

    /**
     * 获取用户被浏览文章的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewPostUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getUnreadViewRemindCount(receiverId, TYPE_POST)
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readViewPostRemind(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.readViewRemind(receiverId, TYPE_POST)
    }

  }
  return View
}
