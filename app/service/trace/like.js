
'use strict'

const TYPE_QUESTION = 1
const TYPE_REPLY = 2
const TYPE_DEMAND = 3
const TYPE_CONSULT = 4
const TYPE_POST = 5
const TYPE_COMMENT = 6

const BaseTraceService = require('./base')

module.exports = app => {

  const { code, util, } = app

  class Like extends BaseTraceService {

    get tableName() {
      return 'trace_like'
    }

    get fields() {
      return [
        'resource_id', 'resource_type', 'resource_parent_id',
        'creator_id', 'anonymous', 'status',
      ]
    }

    get remindService() {
      return this.service.trace.likeRemind
    }

    async toExternal(like) {

      const { account, article, project, qa } = this.service
      const { resource_id, resource_type, resource_parent_id, creator_id } = like

      let type, resource
      if (resource_type == TYPE_QUESTION) {
        type = 'question'
        resource = await qa.question.getFullQuestionById(resource_id)
        resource = await qa.question.toExternal(resource)
      }
      else if (resource_type == TYPE_REPLY) {
        type = 'reply'
        resource = await qa.reply.getFullReplyById(resource_id)
        resource = await qa.reply.toExternal(resource)
      }
      else if (resource_type == TYPE_DEMAND) {
        type = 'demand'
        resource = await project.demand.getFullDemandById(resource_id)
        resource = await project.demand.toExternal(resource)
      }
      else if (resource_type == TYPE_CONSULT) {
        type = 'consult'
        resource = await project.consult.getFullConsultById(resource_id)
        resource = await project.consult.toExternal(resource)
      }
      else if (resource_type == TYPE_POST) {
        type = 'post'
        resource = await article.post.getFullPostById(resource_id)
        resource = await article.post.toExternal(resource)
      }
      else if (resource_type == TYPE_COMMENT) {
        type = 'comment'
        resource = await article.comment.getFullCommentById(resource_id)
        resource = await article.comment.toExternal(resource)
      }

      let creator = await account.user.getFullUserById(creator_id)
      creator = await account.user.toExternal(creator)

      return {
        id: like.id,
        type,
        resource,
        creator,
        create_time: like.create_time.getTime(),
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
        if (record.status === this.STATUS_ACTIVE) {
          this.throw(
            code.RESOURCE_EXISTS,
            '已点赞，不能再次点赞'
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

      if (!record || record.status === this.STATUS_DELETED) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '未点赞，不能取消点赞'
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
     * @param {number} postId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasLikePost(postId, creatorId) {
      return await this.hasTrace({
        creator_id: creatorId,
        resource_id: postId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 用户点赞文章是否已提醒作者
     *
     * @param {number} postId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasLikePostRemind(postId, creatorId) {
      return await this.hasTraceRemind({
        creator_id: creatorId,
        resource_id: postId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 读取文章的点赞数
     *
     * @param {?number} postId
     * @param {?number} creatorId
     * @return {number}
     */
    async getLikePostCount(postId, creatorId) {
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
     * 获取文章的点赞列表
     *
     * @param {?number} postId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getLikePostList(postId, creatorId, options) {
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
     * 获取用户被点赞文章的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getLikePostRemindList(receiverId, options) {
      return await this.remindService.getLikeRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_POST,
        },
        options
      )
    }

    /**
     * 获取用户被点赞文章的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikePostRemindCount(receiverId) {
      return await this.remindService.getLikeRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 获取用户被点赞文章的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikePostUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadLikeRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readLikePostRemind(receiverId) {
      return await this.remindService.readLikeRemind({
        receiver_id: receiverId,
        resource_type: TYPE_POST,
      })
    }



    /**
     * 点赞项目
     *
     * @param {number|Object} demandId
     */
    async likeDemand(demandId) {

      const { account, trace, project } = this.service

      const demand = await project.demand.checkDemandAvailableById(demandId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addLike({
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

          await trace.likeRemind.addLikeRemind({
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
          '点赞失败'
        )
      }

      await account.user.increaseUserLikeCount(demand.user_id)
      await project.demand.increaseDemandLikeCount(demand.id)

    }

    /**
     * 取消点赞项目
     *
     * @param {number|Object} demandId
     */
    async unlikeDemand(demandId) {

      const { account, trace, project } = this.service

      const demand = await project.demand.checkDemandAvailableById(demandId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeLike({
            resource_id: demand.id,
            resource_type: TYPE_DEMAND,
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

      await account.user.decreaseUserLikeCount(demand.user_id)
      await project.demand.decreaseDemandLikeCount(demand.id)

    }

    /**
     * 用户是否已点赞项目
     *
     * @param {number} demandId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasLikeDemand(demandId, creatorId) {
      return await this.hasTrace({
        creator_id: creatorId,
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 用户点赞项目是否已提醒作者
     *
     * @param {number} demandId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasLikeDemandRemind(demandId, creatorId) {
      return await this.hasTraceRemind({
        creator_id: creatorId,
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 读取项目的点赞数
     *
     * @param {?number} demandId
     * @param {?number} creatorId
     * @return {number}
     */
    async getLikeDemandCount(demandId, creatorId) {
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
     * 获取项目的点赞列表
     *
     * @param {?number} demandId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeDemandList(demandId, creatorId, options) {
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
     * 获取用户被点赞项目的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeDemandRemindList(receiverId, options) {
      return await this.remindService.getLikeRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_DEMAND,
        },
        options
      )
    }

    /**
     * 获取用户被点赞项目的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikeDemandRemindCount(receiverId) {
      return await this.remindService.getLikeRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 获取用户被点赞项目的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikeDemandUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadLikeRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readLikeDemandRemind(receiverId) {
      return await this.remindService.readLikeRemind({
        receiver_id: receiverId,
        resource_type: TYPE_DEMAND,
      })
    }





    /**
     * 点赞问题
     *
     * @param {number|Object} questionId
     */
    async likeQuestion(questionId) {

      const { account, trace, qa } = this.service

      const question = await qa.question.checkQuestionAvailableById(questionId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addLike({
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

          await trace.likeRemind.addLikeRemind({
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
          '点赞失败'
        )
      }

      await account.user.increaseUserLikeCount(question.user_id)
      await qa.question.increaseQuestionLikeCount(question.id)

    }

    /**
     * 取消点赞问题
     *
     * @param {number|Object} questionId
     */
    async unlikeQuestion(questionId) {

      const { account, trace, qa } = this.service

      const question = await qa.question.checkQuestionAvailableById(questionId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeLike({
            resource_id: question.id,
            resource_type: TYPE_QUESTION,
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

      await account.user.decreaseUserLikeCount(question.user_id)
      await qa.question.decreaseQuestionLikeCount(question.id)

    }

    /**
     * 用户是否已点赞问题
     *
     * @param {number} questionId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasLikeQuestion(questionId, creatorId) {
      return await this.hasTrace({
        creator_id: creatorId,
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 用户点赞问题是否已提醒作者
     *
     * @param {number} questionId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasLikeQuestionRemind(questionId, creatorId) {
      return await this.hasTraceRemind({
        creator_id: creatorId,
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 读取问题的点赞数
     *
     * @param {?number} questionId
     * @param {?number} creatorId
     * @return {number}
     */
    async getLikeQuestionCount(questionId, creatorId) {
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
     * 获取问题的点赞列表
     *
     * @param {?number} questionId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeQuestionList(questionId, creatorId, options) {
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
     * 获取用户被点赞问题的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeQuestionRemindList(receiverId, options) {
      return await this.remindService.getLikeRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_QUESTION,
        },
        options
      )
    }

    /**
     * 获取用户被点赞问题的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikeQuestionRemindCount(receiverId) {
      return await this.remindService.getLikeRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 获取用户被点赞问题的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikeQuestionUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadLikeRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readLikeQuestionRemind(receiverId) {
      return await this.remindService.readLikeRemind({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }






    /**
     * 点赞回复
     *
     * @param {number|Object} replyId
     */
    async likeReply(replyId) {

      const { account, trace, qa } = this.service

      const reply = await qa.reply.checkReplyAvailableById(replyId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addLike({
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

          await trace.likeRemind.addLikeRemind({
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
          '点赞失败'
        )
      }

      await account.user.increaseUserLikeCount(reply.user_id)
      await qa.reply.increaseReplyLikeCount(reply.id)

    }

    /**
     * 取消点赞回复
     *
     * @param {number|Object} replyId
     */
    async unlikeReply(replyId) {

      const { account, trace, qa } = this.service

      const reply = await qa.reply.checkReplyAvailableById(replyId)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeLike({
            resource_id: reply.id,
            resource_type: TYPE_REPLY,
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

      await account.user.decreaseUserLikeCount(reply.user_id)
      await qa.reply.decreaseReplyLikeCount(reply.id)

    }

    /**
     * 用户是否已点赞回复
     *
     * @param {number} replyId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasLikeReply(replyId, creatorId) {
      return await this.hasTrace({
        creator_id: creatorId,
        resource_id: replyId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 用户点赞回复是否已提醒作者
     *
     * @param {number} replyId
     * @param {number} creatorId
     * @return {boolean}
     */
    async hasLikeReplyRemind(replyId, creatorId) {
      return await this.hasTraceRemind({
        creator_id: creatorId,
        resource_id: replyId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 读取回复的点赞数
     *
     * @param {?number} replyId
     * @param {?number} creatorId
     * @return {number}
     */
    async getLikeReplyCount(replyId, creatorId) {
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
     * 获取回复的点赞列表
     *
     * @param {?number} replyId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeReplyList(replyId, creatorId, options) {
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
     * 获取用户被点赞回复的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeReplyRemindList(receiverId, options) {
      return await this.remindService.getLikeRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_REPLY,
        },
        options
      )
    }

    /**
     * 获取用户被点赞回复的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikeReplyRemindCount(receiverId) {
      return await this.remindService.getLikeRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 获取用户被点赞回复的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikeReplyUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadLikeRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readLikeReplyRemind(receiverId) {
      return await this.remindService.readLikeRemind({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
      })
    }



    /**
     * 获取被点赞的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeRemindList(receiverId, options) {
      return await this.remindService.getLikeRemindList(
        {
          receiver_id: receiverId,
        },
        options
      )
    }

    /**
     * 获取被点赞的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikeRemindCount(receiverId) {
      return await this.remindService.getLikeRemindCount({
        receiver_id: receiverId,
      })
    }

    /**
     * 获取被点赞的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getLikeUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadLikeRemindCount({
        receiver_id: receiverId,
      })
    }

    /**
     * 对所有被点赞标记已读
     *
     * @param {number} receiverId
     */
    async readLikeRemind(receiverId) {
      return await this.remindService.readLikeRemind({
        receiver_id: receiverId,
      })
    }

  }
  return Like
}
