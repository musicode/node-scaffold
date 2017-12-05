
'use strict'

const TYPE_QUESTION = 1
const TYPE_DEMAND = 2
const TYPE_POST = 3
const TYPE_USER = 4
const TYPE_REPLY = 5

const STATUS_ACTIVE = 0
const STATUS_DELETED = 1

module.exports = app => {

  const { code, util, } = app

  class Follow extends app.BaseService {

    get tableName() {
      return 'trace_follow'
    }

    get fields() {
      return [
        'resource_id', 'resource_type',
        'creator_id', 'anonymous', 'status',
      ]
    }

    async toExternal(follow) {

      const { account, article, project } = this.service
      const { resource_id, resource_type, creator_id } = follow

      let type, resource, resourceService
      if (resource_type == TYPE_QUESTION) {
        type = 'question'
      }
      else if (resource_type == TYPE_DEMAND) {
        type = 'demand'
        resource = await project.demand.getFullDemandById(resource_id)
        resource = await project.demand.toExternal(resource)
      }
      else if (resource_type == TYPE_POST) {
        type = 'post'
        resource = await article.post.getFullPostById(resource_id)
        resource = await article.post.toExternal(resource)
      }
      else if (resource_type == USER) {
        type = 'user'
        resource = await account.user.getFullUserById(resource_id)
        resource = await account.user.toExternal(resource)
      }
      else if (resource_type == TYPE_REPLY) {
        type = 'reply'
      }

      let creator = await account.user.getUserById(creator_id)
      creator = await account.user.toExternal(creator)

      return {
        id: follow.id,
        type,
        resource,
        creator,
        create_time: follow.create_time.getTime(),
      }

    }

    /**
     * 关注
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     */
    async _addFollow(data) {

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
            '已关注，不能再次关注'
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
     * 取消关注
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     * @return {Object}
     */
    async _removeFollow(data) {

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
          '未关注，不能取消关注'
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
     * 关注文章
     *
     * @param {number|Object} postId
     */
    async followPost(postId) {

      const { account, trace, article } = this.service

      const post = await article.post.checkPostAvailableById(postId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addFollow({
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

          await trace.followRemind.addFollowRemind({
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
          '关注失败'
        )
      }

      await article.post.increasePostFollowCount(post.id)

    }

    /**
     * 取消关注文章
     *
     * @param {number|Object} postId
     */
    async unfollowPost(postId) {

      const { account, trace, article } = this.service

      const post = await article.post.checkPostAvailableById(postId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeFollow({
            resource_id: post.id,
            resource_type: TYPE_POST,
          })

          await trace.followRemind.removeFollowRemind(record.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消关注失败'
        )
      }

      await article.post.decreasePostFollowCount(post.id)

    }

    /**
     * 用户是否已关注文章
     *
     * @param {number} userId
     * @param {number} postId
     * @return {boolean}
     */
    async hasFollowPost(userId, postId) {

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: userId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户关注文章是否已提醒作者
     *
     * @param {number} userId
     * @param {number} postId
     * @return {boolean}
     */
    async hasFollowPostRemind(userId, postId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: userId,
      })

      if (record) {
        return await trace.followRemind.hasFollowRemind(record.id)
      }

      return false

    }

    /**
     * 读取文章的关注数
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {number}
     */
    async getFollowPostCount(creatorId, postId) {
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
     * 获取文章的关注列表
     *
     * @param {number} creatorId
     * @param {number} postId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowPostList(creatorId, postId, options) {
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
     * 获取用户被关注文章的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowPostRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.followRemind.getFollowRemindList(receiverId, TYPE_POST, options)
    }

    /**
     * 获取用户被关注文章的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowPostRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.followRemind.getFollowRemindCount(receiverId, TYPE_POST)
    }

    /**
     * 获取用户被关注文章的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowPostUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.followRemind.getUnreadFollowRemindCount(receiverId, TYPE_POST)
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readFollowPostRemind(receiverId) {
      const { trace } = this.service
      return await trace.followRemind.readFollowRemind(receiverId, TYPE_POST)
    }




    /**
     * 关注项目
     *
     * @param {number|Object} demandId
     */
    async followDemand(demandId) {

      const { account, trace, project } = this.service

      const demand = await project.demand.checkDemandAvailableById(demandId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addFollow({
            resource_id: demand.id,
            resource_type: TYPE_DEMAND,
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

          await trace.followRemind.addFollowRemind({
            trace_id: traceId,
            resource_type: record.resource_type,
            sender_id: record.creator_id,
            receiver_id: demand.user_id,
          })

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '关注失败'
        )
      }

      await project.demand.increaseDemandFollowCount(demand.id)

    }

    /**
     * 取消关注项目
     *
     * @param {number|Object} demandId
     */
    async unfollowDemand(demandId) {

      const { account, trace, project } = this.service

      const demand = await project.demand.checkDemandAvailableById(demandId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeFollow({
            resource_id: demand.id,
            resource_type: TYPE_DEMAND,
          })

          await trace.followRemind.removeFollowRemind(record.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消关注失败'
        )
      }

      await project.demand.decreaseDemandFollowCount(demand.id)

    }

    /**
     * 用户是否已关注项目
     *
     * @param {number} userId
     * @param {number} demandId
     * @return {boolean}
     */
    async hasFollowDemand(userId, demandId) {

      const record = await this.findOneBy({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
        creator_id: userId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户关注项目是否已提醒作者
     *
     * @param {number} userId
     * @param {number} demandId
     * @return {boolean}
     */
    async hasFollowDemandRemind(userId, demandId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
        creator_id: userId,
      })

      if (record) {
        return await trace.followRemind.hasFollowRemind(record.id)
      }

      return false

    }

    /**
     * 读取项目的关注数
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @return {number}
     */
    async getFollowDemandCount(creatorId, demandId) {
      const where = {
        resource_type: TYPE_DEMAND,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (demandId) {
        where.resource_id = demandId
      }
      return await this.countBy(where)
    }

    /**
     * 获取项目的关注列表
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowDemandList(creatorId, demandId, options) {
      const where = {
        resource_type: TYPE_DEMAND,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (demandId) {
        where.resource_id = demandId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被关注项目的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowDemandRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.followRemind.getFollowRemindList(receiverId, TYPE_DEMAND, options)
    }

    /**
     * 获取用户被关注项目的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowDemandRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.followRemind.getFollowRemindCount(receiverId, TYPE_DEMAND)
    }

    /**
     * 获取用户被关注项目的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowDemandUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.followRemind.getUnreadFollowRemindCount(receiverId, TYPE_DEMAND)
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readFollowDemandRemind(receiverId) {
      const { trace } = this.service
      return await trace.followRemind.readFollowRemind(receiverId, TYPE_DEMAND)
    }

  }
  return Follow
}
