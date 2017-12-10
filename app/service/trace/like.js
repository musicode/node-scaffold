
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

      const { account, article, project, qa } = this.service
      const { resource_id, resource_type, resource_parent_id, creator_id } = like

      let type, resource, resourceService
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
     * @param {number} creatorId
     * @param {number} postId
     * @return {boolean}
     */
    async hasLikePost(creatorId, postId) {

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: creatorId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户点赞文章是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {boolean}
     */
    async hasLikePostRemind(creatorId, postId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: creatorId,
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
      return await trace.likeRemind.getLikeRemindList(
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
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindCount({
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
      const { trace } = this.service
      return await trace.likeRemind.getUnreadLikeRemindCount({
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
      const { trace } = this.service
      return await trace.likeRemind.readLikeRemind({
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
     * @param {number} creatorId
     * @param {number} demandId
     * @return {boolean}
     */
    async hasLikeDemand(creatorId, demandId) {

      const record = await this.findOneBy({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
        creator_id: creatorId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户点赞项目是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @return {boolean}
     */
    async hasLikeDemandRemind(creatorId, demandId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
        creator_id: creatorId,
      })

      if (record) {
        return await trace.likeRemind.hasLikeRemind(record.id)
      }

      return false

    }

    /**
     * 读取项目的点赞数
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @return {number}
     */
    async getLikeDemandCount(creatorId, demandId) {
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
     * 获取项目的点赞列表
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeDemandList(creatorId, demandId, options) {
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
     * 获取用户被点赞项目的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeDemandRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindList(
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
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindCount({
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
      const { trace } = this.service
      return await trace.likeRemind.getUnreadLikeRemindCount({
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
      const { trace } = this.service
      return await trace.likeRemind.readLikeRemind({
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
     * @param {number} creatorId
     * @param {number} questionId
     * @return {boolean}
     */
    async hasLikeQuestion(creatorId, questionId) {

      const record = await this.findOneBy({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
        creator_id: creatorId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户点赞问题是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @return {boolean}
     */
    async hasLikeQuestionRemind(creatorId, questionId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
        creator_id: creatorId,
      })

      if (record) {
        return await trace.likeRemind.hasLikeRemind(record.id)
      }

      return false

    }

    /**
     * 读取问题的点赞数
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @return {number}
     */
    async getLikeQuestionCount(creatorId, questionId) {
      const where = {
        resource_type: TYPE_QUESTION,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (questionId) {
        where.resource_id = questionId
      }
      return await this.countBy(where)
    }

    /**
     * 获取问题的点赞列表
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeQuestionList(creatorId, questionId, options) {
      const where = {
        resource_type: TYPE_QUESTION,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (questionId) {
        where.resource_id = questionId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被点赞问题的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeQuestionRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindList(
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
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindCount({
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
      const { trace } = this.service
      return await trace.likeRemind.getUnreadLikeRemindCount({
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
      const { trace } = this.service
      return await trace.likeRemind.readLikeRemind({
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
     * @param {number} creatorId
     * @param {number} replyId
     * @return {boolean}
     */
    async hasLikeReply(creatorId, replyId) {

      const record = await this.findOneBy({
        resource_id: replyId,
        resource_type: TYPE_REPLY,
        creator_id: creatorId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户点赞回复是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} replyId
     * @return {boolean}
     */
    async hasLikeReplyRemind(creatorId, replyId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: replyId,
        resource_type: TYPE_REPLY,
        creator_id: creatorId,
      })

      if (record) {
        return await trace.likeRemind.hasLikeRemind(record.id)
      }

      return false

    }

    /**
     * 读取回复的点赞数
     *
     * @param {number} creatorId
     * @param {number} replyId
     * @return {number}
     */
    async getLikeReplyCount(creatorId, replyId) {
      const where = {
        resource_type: TYPE_REPLY,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (replyId) {
        where.resource_id = replyId
      }
      return await this.countBy(where)
    }

    /**
     * 获取回复的点赞列表
     *
     * @param {number} creatorId
     * @param {number} replyId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeReplyList(creatorId, replyId, options) {
      const where = {
        resource_type: TYPE_REPLY,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (replyId) {
        where.resource_id = replyId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被点赞回复的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getLikeReplyRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindList(
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
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindCount({
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
      const { trace } = this.service
      return await trace.likeRemind.getUnreadLikeRemindCount({
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
      const { trace } = this.service
      return await trace.likeRemind.readLikeRemind({
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
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindList(
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
      const { trace } = this.service
      return await trace.likeRemind.getLikeRemindCount({
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
      const { trace } = this.service
      return await trace.likeRemind.getUnreadLikeRemindCount({
        receiver_id: receiverId,
      })
    }

    /**
     * 对所有被点赞标记已读
     *
     * @param {number} receiverId
     */
    async readLikeRemind(receiverId) {
      const { trace } = this.service
      return await trace.likeRemind.readLikeRemind({
        receiver_id: receiverId,
      })
    }

  }
  return Like
}
