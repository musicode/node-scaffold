
'use strict'

const TYPE_QUESTION = 1
const TYPE_DEMAND = 2
const TYPE_POST = 3
const TYPE_USER = 4
const TYPE_REPLY = 5

const BaseTraceService = require('./base')

module.exports = app => {

  const { code, util, } = app

  class Follow extends BaseTraceService {

    get TYPE_QUESTION() {
      return TYPE_QUESTION
    }

    get TYPE_DEMAND() {
      return TYPE_DEMAND
    }

    get TYPE_POST() {
      return TYPE_POST
    }

    get TYPE_USER() {
      return TYPE_USER
    }

    get TYPE_REPLY() {
      return TYPE_REPLY
    }

    get tableName() {
      return 'trace_follow'
    }

    get fields() {
      return [
        'resource_id', 'resource_type',
        'creator_id', 'anonymous', 'status',
      ]
    }

    get remindService() {
      return this.service.trace.followRemind
    }

    async toExternal(follow) {

      const { account, article, project, qa } = this.service
      const { resource_id, resource_type, creator_id } = follow

      let type, resource
      if (resource_type == TYPE_QUESTION) {
        type = 'question'
        resource = await qa.question.getFullQuestionById(resource_id)
        resource = await qa.question.toExternal(resource)
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
      else if (resource_type == TYPE_USER) {
        type = 'user'
        resource = await account.user.getFullUserById(resource_id)
        resource = await account.user.toExternal(resource)
      }
      else if (resource_type == TYPE_REPLY) {
        type = 'reply'
        resource = await qa.reply.getFullReplyById(resource_id)
        resource = await qa.reply.toExternal(resource)
      }

      let creator = await account.user.getFullUserById(creator_id)
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
        if (record.status === this.STATUS_ACTIVE) {
          this.throw(
            code.RESOURCE_EXISTS,
            '已关注，不能再次关注'
          )
        }
        await this.update(
          {
            status: this.STATUS_ACTIVE,
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

      if (!record || record.status === this.STATUS_DELETED) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '未关注，不能取消关注'
        )
      }

      await this.update(
        {
          status: this.STATUS_DELETED,
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
     * @param {number} postId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowPost(postId, creatorId) {
      return await this.hasTrace({
        creator_id: creatorId,
        resource_id: postId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 用户关注文章是否已提醒作者
     *
     * @param {number} postId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowPostRemind(postId, creatorId) {
      return await this.hasTraceRemind({
        creator_id: creatorId,
        resource_id: postId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 读取文章的关注数
     *
     * @param {?number} postId
     * @param {?number} creatorId
     * @return {number}
     */
    async getFollowPostCount(postId, creatorId) {
      const where = {
        resource_type: TYPE_POST,
      }
      if (postId) {
        where.resource_id = postId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceCount(where)
    }

    /**
     * 获取文章的关注列表
     *
     * @param {?number} postId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowPostList(postId, creatorId, options) {
      const where = {
        resource_type: TYPE_POST,
      }
      if (postId) {
        where.resource_id = postId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceList(where, options)
    }

    /**
     * 获取用户被关注文章的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowPostRemindList(receiverId, options) {
      return await this.remindService.getFollowRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_POST,
        },
        options
      )
    }

    /**
     * 获取用户被关注文章的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowPostRemindCount(receiverId) {
      return await this.remindService.getFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 获取用户被关注文章的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowPostUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readFollowPostRemind(receiverId) {
      return await this.remindService.readFollowRemind({
        receiver_id: receiverId,
        resource_type: TYPE_POST,
      })
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
     * @param {number} demandId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowDemand(demandId, creatorId) {
      return await this.hasTrace({
        creator_id: creatorId,
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 用户关注项目是否已提醒作者
     *
     * @param {number} demandId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowDemandRemind(demandId, creatorId) {
      return await this.hasTraceRemind({
        creator_id: creatorId,
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 读取项目的关注数
     *
     * @param {?number} demandId
     * @param {?number} creatorId
     * @return {number}
     */
    async getFollowDemandCount(demandId, creatorId) {
      const where = {
        resource_type: TYPE_DEMAND,
      }
      if (demandId) {
        where.resource_id = demandId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceCount(where)
    }

    /**
     * 获取项目的关注列表
     *
     * @param {?number} demandId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowDemandList(demandId, creatorId, options) {
      const where = {
        resource_type: TYPE_DEMAND,
      }
      if (demandId) {
        where.resource_id = demandId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceList(where, options)
    }

    /**
     * 获取用户被关注项目的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowDemandRemindList(receiverId, options) {
      return await this.remindService.getFollowRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_DEMAND,
        },
        options
      )
    }

    /**
     * 获取用户被关注项目的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowDemandRemindCount(receiverId) {
      return await this.remindService.getFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 获取用户被关注项目的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowDemandUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readFollowDemandRemind(receiverId) {
      return await this.remindService.readFollowRemind({
        receiver_id: receiverId,
        resource_type: TYPE_DEMAND,
      })
    }






    /**
     * 关注问题
     *
     * @param {number|Object} questionId
     */
    async followQuestion(questionId) {

      const { account, trace, qa } = this.service

      const question = await qa.question.checkQuestionAvailableById(questionId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addFollow({
            resource_id: question.id,
            resource_type: TYPE_QUESTION,
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
            receiver_id: question.user_id,
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

      await qa.question.increaseQuestionFollowCount(question.id)

    }

    /**
     * 取消关注问题
     *
     * @param {number|Object} questionId
     */
    async unfollowQuestion(questionId) {

      const { account, trace, qa } = this.service

      const question = await qa.question.checkQuestionAvailableById(questionId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeFollow({
            resource_id: question.id,
            resource_type: TYPE_QUESTION,
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

      await qa.question.decreaseQuestionFollowCount(question.id)

    }

    /**
     * 用户是否已关注问题
     *
     * @param {number} questionId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowQuestion(questionId, creatorId) {
      return await this.hasTrace({
        creator_id: creatorId,
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 用户关注问题是否已提醒作者
     *
     * @param {number} questionId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowQuestionRemind(questionId, creatorId) {
      return await this.hasTraceRemind({
        creator_id: creatorId,
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 读取问题的关注数
     *
     * @param {?number} questionId
     * @param {?number} creatorId
     * @return {number}
     */
    async getFollowQuestionCount(questionId, creatorId) {
      const where = {
        resource_type: TYPE_QUESTION,
      }
      if (questionId) {
        where.resource_id = questionId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceCount(where)
    }

    /**
     * 获取问题的关注列表
     *
     * @param {?number} questionId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowQuestionList(questionId, creatorId, options) {
      const where = {
        resource_type: TYPE_QUESTION,
      }
      if (questionId) {
        where.resource_id = questionId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceList(where, options)
    }

    /**
     * 获取用户被关注问题的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowQuestionRemindList(receiverId, options) {
      return await this.remindService.getFollowRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_QUESTION,
        },
        options
      )
    }

    /**
     * 获取用户被关注问题的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowQuestionRemindCount(receiverId) {
      return await this.remindService.getFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 获取用户被关注问题的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowQuestionUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readFollowQuestionRemind(receiverId) {
      return await this.remindService.readFollowRemind({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }






    /**
     * 关注回复
     *
     * @param {number|Object} replyId
     */
    async followReply(replyId) {

      const { account, trace, qa } = this.service

      const reply = await qa.reply.checkReplyAvailableById(replyId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addFollow({
            resource_id: reply.id,
            resource_type: TYPE_REPLY,
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
            receiver_id: reply.user_id,
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

      await qa.reply.increaseReplyFollowCount(reply.id)

    }

    /**
     * 取消关注回复
     *
     * @param {number|Object} replyId
     */
    async unfollowReply(replyId) {

      const { account, trace, qa } = this.service

      const reply = await qa.reply.checkReplyAvailableById(replyId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeFollow({
            resource_id: reply.id,
            resource_type: TYPE_REPLY,
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

      await qa.reply.decreaseReplyFollowCount(reply.id)

    }

    /**
     * 用户是否已关注回复
     *
     * @param {number} replyId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowReply(replyId, creatorId) {
      return await this.hasTrace({
        creator_id: creatorId,
        resource_id: replyId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 用户关注回复是否已提醒作者
     *
     * @param {number} replyId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowReplyRemind(replyId, creatorId) {
      return await this.hasTraceRemind({
        creator_id: creatorId,
        resource_id: replyId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 读取回复的关注数
     *
     * @param {?number} replyId
     * @param {?number} creatorId
     * @return {number}
     */
    async getFollowReplyCount(replyId, creatorId) {
      const where = {
        resource_type: TYPE_REPLY,
      }
      if (replyId) {
        where.resource_id = replyId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceCount(where)
    }

    /**
     * 获取回复的关注列表
     *
     * @param {?number} replyId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowReplyList(replyId, creatorId, options) {
      const where = {
        resource_type: TYPE_REPLY,
      }
      if (replyId) {
        where.resource_id = replyId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceList(where, options)
    }

    /**
     * 获取用户被关注回复的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowReplyRemindList(receiverId, options) {
      return await this.remindService.getFollowRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_REPLY,
        },
        options
      )
    }

    /**
     * 获取用户被关注回复的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowReplyRemindCount(receiverId) {
      return await this.remindService.getFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 获取用户被关注回复的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowReplyUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readFollowReplyRemind(receiverId) {
      return await this.remindService.readFollowRemind({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
      })
    }







    /**
     * 关注用户
     *
     * @param {number|Object} userId
     */
    async followUser(userId) {

      const { account, trace } = this.service

      const user = await account.user.checkUserAvailableById(userId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addFollow({
            resource_id: user.id,
            resource_type: TYPE_USER,
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
            receiver_id: user.id,
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

    }

    /**
     * 取消关注用户
     *
     * @param {number|Object} userId
     */
    async unfollowUser(userId) {

      const { account, trace } = this.service

      const user = await account.user.checkUserAvailableById(userId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeFollow({
            resource_id: user.id,
            resource_type: TYPE_USER,
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

    }

    /**
     * 用户是否已关注用户
     *
     * @param {number} userId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowUser(userId, creatorId) {
      return await this.hasTrace({
        creator_id: creatorId,
        resource_id: userId,
        resource_type: TYPE_USER,
      })
    }

    /**
     * 用户关注用户是否已提醒作者
     *
     * @param {number} userId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasFollowUserRemind(userId, creatorId) {
      return await this.hasTraceRemind({
        creator_id: creatorId,
        resource_id: userId,
        resource_type: TYPE_USER,
      })
    }

    /**
     * 读取用户的关注数
     *
     * @param {?number} userId
     * @param {?number} creatorId
     * @return {number}
     */
    async getFollowUserCount(userId, creatorId) {
      const where = {
        resource_type: TYPE_USER,
      }
      if (userId) {
        where.resource_id = userId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceCount(where)
    }

    /**
     * 获取用户的关注列表
     *
     * @param {?number} userId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowUserList(userId, creatorId, options) {
      const where = {
        resource_type: TYPE_USER,
      }
      if (userId) {
        where.resource_id = userId
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceList(where, options)
    }

    /**
     * 获取用户被关注用户的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getFollowUserRemindList(receiverId, options) {
      return await this.remindService.getFollowRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_USER,
        },
        options
      )
    }

    /**
     * 获取用户被关注用户的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowUserRemindCount(receiverId) {
      return await this.remindService.getFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_USER,
      })
    }

    /**
     * 获取用户被关注用户的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getFollowUserUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadFollowRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_USER,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readFollowUserRemind(receiverId) {
      return await this.remindService.readFollowRemind({
        receiver_id: receiverId,
        resource_type: TYPE_USER,
      })
    }

  }
  return Follow
}
