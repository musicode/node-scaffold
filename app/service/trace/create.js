
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

  class Create extends app.BaseService {

    get tableName() {
      return 'trace_create'
    }

    get fields() {
      return [
        'resource_id', 'resource_type', 'resource_master_id', 'resource_parent_id',
        'creator_id', 'anonymous', 'status',
      ]
    }

    /**
     * 创建
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     * @property {number} data.anonymous
     */
    async _addCreate(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const record = await this.findOneBy({
        resource_id: data.resource_id,
        resource_type: data.resource_type,
        creator_id: currentUser.id,
      })

      if (record) {
        const fields = {
          status: STATUS_ACTIVE,
        }
        if (util.type(data.anonymous) === 'number') {
          fields.anonymous = data.anonymous
        }
        await this.update(
          fields,
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
     * 取消创建
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     * @return {Object}
     */
    async _removeCreate(data) {

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
          '未创建，不能取消创建'
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
     * 创建文章
     *
     * @param {number} postId
     * @param {number} anonymous
     */
    async createPost(postId, anonymous) {

      let traceId = await this._addCreate({
        resource_id: postId,
        resource_type: TYPE_POST,
        anonymous,
      })

      if (traceId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '创建失败'
        )
      }

    }

    /**
     * 取消创建文章
     *
     * @param {number} postId
     */
    async uncreatePost(postId) {

      const record = await this._removeCreate({
        resource_id: postId,
        resource_type: TYPE_POST,
      })

      if (record == null) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消创建失败'
        )
      }

    }

    /**
     * 用户是否已创建文章
     *
     * @param {number} postId
     * @return {boolean}
     */
    async hasCreatePost(postId) {

      const record = await this.getCreatePost(postId)

      return record ? true : false

    }

    /**
     * 用户是否已创建文章
     *
     * @param {number} postId
     * @return {boolean}
     */
    async getCreatePost(postId) {

      return await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        status: STATUS_ACTIVE,
      })

    }




    /**
     * 创建评论
     *
     * @param {number} commentId
     * @param {number} anonymous
     * @param {number} postId
     * @param {number} parentId
     */
    async createComment(commentId, anonymous, postId, parentId) {

      const { article, trace } = this.service

      const post = await article.post.checkPostAvailableById(postId, true)

      let parentComment
      if (parentId) {
        parentComment = await article.comment.checkCommentAvailableById(parentId, true)
      }

      const isSuccess = await this.transaction(
        async () => {

          let row = {
            resource_id: commentId,
            resource_type: TYPE_COMMENT,
            resource_master_id: post.id,
            anonymous,
          }

          if (parentComment) {
            row.resource_parent_id = parentComment.id
          }

          const traceId = await this._addCreate(row)

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

          row = {
            trace_id: traceId,
            resource_type: record.resource_type,
            sender_id: record.creator_id,
            receiver_id: post.user_id,
          }

          if (parentComment) {
            row.resource_parent_id = parentComment.id
          }

          await trace.createRemind.addCreateRemind(row)

          if (parentComment) {
            row.receiver_id = parentComment.user_id
            await trace.createRemind.addCreateRemind(row)
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '创建失败'
        )
      }

    }

    /**
     * 取消创建评论
     *
     * @param {number} commentId
     */
    async uncreateComment(commentId) {

      const { article, trace } = this.service

      const comment = await article.comment.checkCommentAvailableById(commentId)
      const post = await article.post.checkPostAvailableById(comment.post_id)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeCreate({
            resource_id: commentId,
            resource_type: TYPE_COMMENT,
          })

          await trace.createRemind.removeCreateRemind(post.user_id, record.id)

          if (comment.parent_id) {
            const parentComment = await await article.comment.checkCommentAvailableById(comment.parent_id)
            await trace.createRemind.removeCreateRemind(parentComment.user_id, record.id)
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消创建失败'
        )
      }

    }

    /**
     * 用户是否已创建评论
     *
     * @param {number} commentId
     * @return {boolean}
     */
    async hasCreateComment(commentId) {

      const record = await this.getCreateComment(commentId)

      return record ? true : false

    }

    /**
     * 用户是否已创建评论
     *
     * @param {number} commentId
     * @return {boolean}
     */
    async getCreateComment(commentId) {

      return await this.findOneBy({
        resource_id: commentId,
        resource_type: TYPE_COMMENT,
        status: STATUS_ACTIVE,
      })

    }


    /**
     * 用户评论文章是否已提醒作者
     *
     * @param {number} commentId
     * @return {boolean}
     */
    async hasCreateCommentRemind(commentId) {

      const { article, trace } = this.service

      const record = await this.findOneBy({
        resource_id: commentId,
        resource_type: TYPE_COMMENT,
      })
      if (!record) {
        return false
      }

      const comment = await article.comment.checkCommentAvailableById(commentId)
      if (!comment) {
        return false
      }

      const post = await article.post.checkPostAvailableById(comment.post_id)
      if (!post) {
        return false
      }

      let hasParentRemind = true
      if (comment.parent_id) {
        const parentComment = await article.comment.checkCommentAvailableById(comment.parent_id)
        hasParentRemind = await trace.createRemind.hasCreateRemind(parentComment.user_id, record.id)
      }

      const hasPostRemind = await trace.createRemind.hasCreateRemind(post.user_id, record.id)

      return hasPostRemind && hasParentRemind

    }

    /**
     * 读取文章的评论数
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {number}
     */
    async getCreateCommentCount(creatorId, postId) {
      const where = {
        resource_type: TYPE_COMMENT,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (postId) {
        where.resource_master_id = postId
      }
      return await this.countBy(where)
    }

    /**
     * 获取文章的评论列表
     *
     * @param {number} creatorId
     * @param {number} postId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateCommentList(creatorId, postId, options) {
      const where = {
        resource_type: TYPE_COMMENT,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (postId) {
        where.resource_master_id = postId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被评论文章的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateCommentRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.createRemind.getCreateRemindList(receiverId, TYPE_COMMENT, options)
    }

    /**
     * 获取用户被评论文章的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateCommentRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.createRemind.getCreateRemindCount(receiverId, TYPE_COMMENT)
    }

    /**
     * 获取用户被评论文章的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateCommentUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.createRemind.getUnreadCreateRemindCount(receiverId, TYPE_COMMENT)
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readCreateCommentRemind(receiverId) {
      const { trace } = this.service
      return await trace.createRemind.readCreateRemind(receiverId, TYPE_COMMENT)
    }






    /**
     * 创建项目
     *
     * @param {number} demandId
     */
    async createDemand(demandId) {

      let traceId = await this._addCreate({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
      })

      if (traceId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '创建失败'
        )
      }

    }

    /**
     * 取消创建项目
     *
     * @param {number} demandId
     */
    async uncreateDemand(demandId) {

      const record = await this._removeCreate({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
      })

      if (record == null) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消创建失败'
        )
      }

    }

    /**
     * 用户是否已创建项目
     *
     * @param {number} demandId
     * @return {boolean}
     */
    async hasCreateDemand(demandId) {

      const record = await this.getCreateDemand(demandId)

      return record ? true : false

    }

    /**
     * 用户是否已创建项目
     *
     * @param {number} demandId
     * @return {boolean}
     */
    async getCreateDemand(demandId) {

      return await this.findOneBy({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
        status: STATUS_ACTIVE,
      })

    }




    /**
     * 创建咨询
     *
     * @param {number} consultId
     * @param {number} demandId
     * @param {number} parentId
     */
    async createConsult(consultId, demandId, parentId) {

      const { project, trace } = this.service

      const demand = await project.demand.checkDemandAvailableById(demandId, true)

      let parentConsult
      if (parentId) {
        parentConsult = await project.consult.checkConsultAvailableById(parentId, true)
      }

      const isSuccess = await this.transaction(
        async () => {

          let row = {
            resource_id: consultId,
            resource_type: TYPE_CONSULT,
            resource_master_id: demand.id,
          }

          if (parentConsult) {
            row.resource_parent_id = parentConsult.id
          }

          const traceId = await this._addCreate(row)

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

          row = {
            trace_id: traceId,
            resource_type: record.resource_type,
            sender_id: record.creator_id,
            receiver_id: demand.user_id,
          }

          if (parentConsult) {
            row.resource_parent_id = parentConsult.id
          }

          await trace.createRemind.addCreateRemind(row)

          if (parentConsult) {
            row.receiver_id = parentConsult.user_id
            await trace.createRemind.addCreateRemind(row)
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '创建失败'
        )
      }

    }

    /**
     * 取消创建咨询
     *
     * @param {number} consultId
     */
    async uncreateConsult(consultId) {

      const { project, trace } = this.service

      const consult = await project.consult.checkConsultAvailableById(consultId)
      const demand = await project.demand.checkDemandAvailableById(consult.demand_id)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeCreate({
            resource_id: consultId,
            resource_type: TYPE_CONSULT,
          })

          await trace.createRemind.removeCreateRemind(demand.user_id, record.id)

          if (consult.parent_id) {
            const parentConsult = await await project.consult.checkConsultAvailableById(consult.parent_id)
            await trace.createRemind.removeCreateRemind(parentConsult.user_id, record.id)
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消创建失败'
        )
      }

    }

    /**
     * 用户是否已创建咨询
     *
     * @param {number} consultId
     * @return {boolean}
     */
    async hasCreateConsult(consultId) {

      const record = await this.getCreateConsult(consultId)

      return record ? true : false

    }

    /**
     * 用户是否已创建咨询
     *
     * @param {number} consultId
     * @return {boolean}
     */
    async getCreateConsult(consultId) {

      return await this.findOneBy({
        resource_id: consultId,
        resource_type: TYPE_CONSULT,
        status: STATUS_ACTIVE,
      })

    }


    /**
     * 用户咨询项目是否已提醒作者
     *
     * @param {number} consultId
     * @return {boolean}
     */
    async hasCreateConsultRemind(consultId) {

      const { project, trace } = this.service

      const record = await this.findOneBy({
        resource_id: consultId,
        resource_type: TYPE_CONSULT,
      })
      if (!record) {
        return false
      }

      const consult = await project.consult.checkConsultAvailableById(consultId)
      if (!consult) {
        return false
      }

      const demand = await project.demand.checkDemandAvailableById(consult.demand_id)
      if (!demand) {
        return false
      }

      let hasParentRemind = true
      if (consult.parent_id) {
        const parentConsult = await project.consult.checkConsultAvailableById(consult.parent_id)
        hasParentRemind = await trace.createRemind.hasCreateRemind(parentConsult.user_id, record.id)
      }

      const hasDemandRemind = await trace.createRemind.hasCreateRemind(demand.user_id, record.id)

      return hasDemandRemind && hasParentRemind

    }

    /**
     * 读取项目的咨询数
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @return {number}
     */
    async getCreateConsultCount(creatorId, demandId) {
      const where = {
        resource_type: TYPE_CONSULT,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (demandId) {
        where.resource_master_id = demandId
      }
      return await this.countBy(where)
    }

    /**
     * 获取项目的咨询列表
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateConsultList(creatorId, demandId, options) {
      const where = {
        resource_type: TYPE_CONSULT,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (demandId) {
        where.resource_master_id = demandId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被咨询项目的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateConsultRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.createRemind.getCreateRemindList(receiverId, TYPE_CONSULT, options)
    }

    /**
     * 获取用户被咨询项目的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateConsultRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.createRemind.getCreateRemindCount(receiverId, TYPE_CONSULT)
    }

    /**
     * 获取用户被咨询项目的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateConsultUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.createRemind.getUnreadCreateRemindCount(receiverId, TYPE_CONSULT)
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readCreateConsultRemind(receiverId) {
      const { trace } = this.service
      return await trace.createRemind.readCreateRemind(receiverId, TYPE_CONSULT)
    }








    /**
     * 创建问题
     *
     * @param {number} questionId
     * @param {number} anonymous
     */
    async createQuestion(questionId, anonymous) {

      let traceId = await this._addCreate({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
        anonymous,
      })

      if (traceId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '创建失败'
        )
      }

    }

    /**
     * 取消创建问题
     *
     * @param {number} questionId
     */
    async uncreateQuestion(questionId) {

      const record = await this._removeCreate({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
      })

      if (record == null) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消创建失败'
        )
      }

    }

    /**
     * 用户是否已创建问题
     *
     * @param {number} questionId
     * @return {boolean}
     */
    async hasCreateQuestion(questionId) {

      const record = await this.getCreateQuestion(questionId)

      return record ? true : false

    }

    /**
     * 用户是否已创建问题
     *
     * @param {number} questionId
     * @return {boolean}
     */
    async getCreateQuestion(questionId) {

      return await this.findOneBy({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
        status: STATUS_ACTIVE,
      })

    }




    /**
     * 创建回复
     *
     * @param {number} replyId
     * @param {number} anonymous
     * @param {number} questionId
     * @param {number} rootId
     * @param {number} parentId
     */
    async createReply(replyId, anonymous, questionId, rootId, parentId) {

      const { qa, trace } = this.service

      const question = await qa.question.checkQuestionAvailableById(questionId, true)

      let rootReply
      if (rootId) {
        rootReply = await qa.reply.checkReplyAvailableById(rootId, true)
      }

      let parentReply
      if (parentId) {
        parentReply = await qa.reply.checkReplyAvailableById(parentId, true)
      }

      const isSuccess = await this.transaction(
        async () => {

          let row = {
            resource_id: replyId,
            resource_type: TYPE_REPLY,
            resource_master_id: question.id,
            anonymous,
          }

          if (parentReply) {
            row.resource_parent_id = parentReply.id
          }

          const traceId = await this._addCreate(row)

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

          row = {
            trace_id: traceId,
            resource_type: record.resource_type,
            sender_id: record.creator_id,
            receiver_id: question.user_id,
          }

          if (parentReply) {
            row.resource_parent_id = parentReply.id
          }

          await trace.createRemind.addCreateRemind(row)

          if (rootReply) {
            row.receiver_id = rootReply.user_id
            await trace.createRemind.addCreateRemind(row)
          }

          if (parentReply && rootId !== parentId) {
            row.receiver_id = parentReply.user_id
            await trace.createRemind.addCreateRemind(row)
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '创建失败'
        )
      }

    }

    /**
     * 取消创建回复
     *
     * @param {number} replyId
     */
    async uncreateReply(replyId) {

      const { qa, trace } = this.service

      const reply = await qa.reply.checkReplyAvailableById(replyId)
      const question = await qa.question.checkQuestionAvailableById(reply.question_id)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeCreate({
            resource_id: replyId,
            resource_type: TYPE_REPLY,
          })

          await trace.createRemind.removeCreateRemind(question.user_id, record.id)

          if (reply.root_id) {
            const rootReply = await await qa.reply.checkReplyAvailableById(reply.root_id)
            await trace.createRemind.removeCreateRemind(rootReply.user_id, record.id)
          }

          if (reply.parent_id && reply.parent_id !== reply.root_id) {
            const parentReply = await await qa.reply.checkReplyAvailableById(reply.parent_id)
            await trace.createRemind.removeCreateRemind(parentReply.user_id, record.id)
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消创建失败'
        )
      }

    }

    /**
     * 用户是否已创建回复
     *
     * @param {number} replyId
     * @return {boolean}
     */
    async hasCreateReply(replyId) {

      const record = await this.getCreateReply(replyId)

      return record ? true : false

    }

    /**
     * 用户是否已创建回复
     *
     * @param {number} replyId
     * @return {boolean}
     */
    async getCreateReply(replyId) {

      return await this.findOneBy({
        resource_id: replyId,
        resource_type: TYPE_REPLY,
        status: STATUS_ACTIVE,
      })

    }


    /**
     * 用户回复问题是否已提醒作者
     *
     * @param {number} replyId
     * @return {boolean}
     */
    async hasCreateReplyRemind(replyId) {

      const { qa, trace } = this.service

      const record = await this.findOneBy({
        resource_id: replyId,
        resource_type: TYPE_REPLY,
      })
      if (!record) {
        return false
      }

      const reply = await qa.reply.checkReplyAvailableById(replyId)
      if (!reply) {
        return false
      }

      const question = await qa.question.checkQuestionAvailableById(reply.question_id)
      if (!question) {
        return false
      }

      let hasRootRemind = true
      if (reply.root_id) {
        const rootReply = await qa.reply.checkReplyAvailableById(reply.root_id)
        hasRootRemind = await trace.createRemind.hasCreateRemind(rootReply.user_id, record.id)
      }

      let hasParentRemind = true
      if (reply.parent_id && reply.parent_id !== reply.root_id) {
        const parentReply = await qa.reply.checkReplyAvailableById(reply.parent_id)
        hasParentRemind = await trace.createRemind.hasCreateRemind(parentReply.user_id, record.id)
      }

      const hasQuestionRemind = await trace.createRemind.hasCreateRemind(question.user_id, record.id)

      return hasQuestionRemind && hasRootRemind && hasParentRemind

    }

    /**
     * 读取问题的回复数
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @return {number}
     */
    async getCreateReplyCount(creatorId, questionId) {
      const where = {
        resource_type: TYPE_REPLY,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (questionId) {
        where.resource_master_id = questionId
      }
      return await this.countBy(where)
    }

    /**
     * 获取问题的回复列表
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateReplyList(creatorId, questionId, options) {
      const where = {
        resource_type: TYPE_REPLY,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (questionId) {
        where.resource_master_id = questionId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被回复问题的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateReplyRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.createRemind.getCreateRemindList(receiverId, TYPE_REPLY, options)
    }

    /**
     * 获取用户被回复问题的提醒数量
     *
     * @param {number} receiverId
     * @param {boolean} isAnswer
     * @return {number}
     */
    async getCreateReplyRemindCount(receiverId, isAnswer) {
      const { trace } = this.service
      return await trace.createRemind.getCreateRemindCount(receiverId, TYPE_REPLY, isAnswer ? 0 : null)
    }

    /**
     * 获取用户被回复问题的未读提醒数量
     *
     * @param {number} receiverId
     * @param {boolean} isAnswer
     * @return {number}
     */
    async getCreateReplyUnreadRemindCount(receiverId, isAnswer) {
      const { trace } = this.service
      return await trace.createRemind.getUnreadCreateRemindCount(receiverId, TYPE_REPLY, isAnswer ? 0 : null)
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     * @param {boolean} isAnswer
     */
    async readCreateReplyRemind(receiverId, isAnswer) {
      const { trace } = this.service
      return await trace.createRemind.readCreateRemind(receiverId, TYPE_REPLY, isAnswer ? 0 : null)
    }

  }
  return Create
}
