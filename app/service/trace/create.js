
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

  class Create extends BaseTraceService {

    get TYPE_QUESTION() {
      return TYPE_QUESTION
    }

    get TYPE_REPLY() {
      return TYPE_REPLY
    }

    get TYPE_DEMAND() {
      return TYPE_DEMAND
    }

    get TYPE_CONSULT() {
      return TYPE_CONSULT
    }

    get TYPE_POST() {
      return TYPE_POST
    }

    get TYPE_COMMENT() {
      return TYPE_COMMENT
    }

    get tableName() {
      return 'trace_create'
    }

    get fields() {
      return [
        'resource_id', 'resource_type', 'resource_master_id', 'resource_parent_id',
        'creator_id', 'anonymous', 'status',
      ]
    }

    get remindService() {
      return this.service.trace.createRemind
    }

    async toExternal(create) {

      const { account, article, project, qa } = this.service
      const { resource_id, resource_type, resource_master_id, resource_parent_id, creator_id } = create

      let type, resource, master, parent
      if (resource_type == TYPE_QUESTION) {
        type = 'question'
        resource = await qa.question.getFullQuestionById(resource_id)
        resource = await qa.question.toExternal(resource)
      }
      else if (resource_type == TYPE_REPLY) {
        type = 'reply'
        resource = await qa.reply.getFullReplyById(resource_id)
        resource = await qa.reply.toExternal(resource)
        if (resource_master_id) {
          master = await qa.question.getFullQuestionById(resource_master_id)
          master = await qa.question.toExternal(master)
        }
        if (resource_parent_id) {
          parent = await qa.reply.getFullReplyById(resource_parent_id)
          parent = await qa.reply.toExternal(parent)
        }
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
        if (resource_master_id) {
          master = await project.demand.getFullDemandById(resource_master_id)
          master = await project.demand.toExternal(master)
        }
        if (resource_parent_id) {
          parent = await project.consult.getFullConsultById(resource_parent_id)
          parent = await project.consult.toExternal(parent)
        }
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
        if (resource_master_id) {
          master = await article.post.getFullPostById(resource_master_id)
          master = await article.post.toExternal(master)
        }
        if (resource_parent_id) {
          parent = await article.comment.getFullCommentById(resource_parent_id)
          parent = await article.comment.toExternal(parent)
        }
      }
      else if (resource_type == TYPE_USER) {
        type = 'user'
        resource = await account.user.getFullUserById(resource_id)
        resource = await account.user.toExternal(resource)
      }

      let creator = await account.user.getFullUserById(creator_id)
      creator = await account.user.toExternal(creator)

      return {
        id: create.id,
        type,
        resource,
        master,
        parent,
        creator,
        create_time: create.create_time.getTime(),
      }

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
          status: this.STATUS_ACTIVE,
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

      if (!record || record.status === this.STATUS_DELETED) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '未创建，不能取消创建'
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
      return await this.hasTrace({
        resource_id: postId,
        resource_type: TYPE_POST,
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

      const { article } = this.service

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

          await this.remindService.addCreateRemind(row)

          if (parentComment) {
            row.receiver_id = parentComment.user_id
            await this.remindService.addCreateRemind(row)
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

      const { article } = this.service

      const comment = await article.comment.checkCommentAvailableById(commentId)
      const post = await article.post.checkPostAvailableById(comment.post_id)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeCreate({
            resource_id: commentId,
            resource_type: TYPE_COMMENT,
          })

          await this.remindService.removeCreateRemind(record.id, post.user_id)

          if (comment.parent_id) {
            const parentComment = await await article.comment.checkCommentAvailableById(comment.parent_id)
            await this.remindService.removeCreateRemind(record.id, parentComment.user_id)
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
      return await this.hasTrace({
        resource_id: commentId,
        resource_type: TYPE_COMMENT,
      })
    }


    /**
     * 用户评论文章是否已提醒作者
     *
     * @param {number} commentId
     * @return {boolean}
     */
    async hasCreateCommentRemind(commentId) {

      const { article } = this.service

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
        hasParentRemind = await this.remindService.hasCreateRemind(record.id, parentComment.user_id)
      }

      const hasPostRemind = await this.remindService.hasCreateRemind(record.id, post.user_id)

      return hasPostRemind && hasParentRemind

    }

    /**
     * 读取文章的评论数
     *
     * @param {number} postId
     * @param {?number} creatorId
     * @return {number}
     */
    async getCreateCommentCount(postId, creatorId) {
      const where = {
        resource_master_id: postId,
        resource_type: TYPE_COMMENT,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceCount(where)
    }

    /**
     * 获取文章的评论列表
     *
     * @param {number} postId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateCommentList(postId, creatorId, options) {
      const where = {
        resource_master_id: postId,
        resource_type: TYPE_COMMENT,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceList(where, options)
    }

    /**
     * 获取用户被评论文章的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateCommentRemindList(receiverId, options) {
      return await this.remindService.getCreateRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_COMMENT,
        },
        options
      )
    }

    /**
     * 获取用户被评论文章的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateCommentRemindCount(receiverId) {
      return await this.remindService.getCreateRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_COMMENT,
      })
    }

    /**
     * 获取用户被评论文章的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateCommentUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadCreateRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_COMMENT,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readCreateCommentRemind(receiverId) {
      return await this.remindService.readCreateRemind({
        receiver_id: receiverId,
        resource_type: TYPE_COMMENT,
      })
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
      return await this.hasTrace({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
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

      const { project } = this.service

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

          await this.remindService.addCreateRemind(row)

          if (parentConsult) {
            row.receiver_id = parentConsult.user_id
            await this.remindService.addCreateRemind(row)
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

      const { project } = this.service

      const consult = await project.consult.checkConsultAvailableById(consultId)
      const demand = await project.demand.checkDemandAvailableById(consult.demand_id)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeCreate({
            resource_id: consultId,
            resource_type: TYPE_CONSULT,
          })

          await this.remindService.removeCreateRemind(record.id, demand.user_id)

          if (consult.parent_id) {
            const parentConsult = await await project.consult.checkConsultAvailableById(consult.parent_id)
            await this.remindService.removeCreateRemind(record.id, parentConsult.user_id)
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
      return await this.hasTrace({
        resource_id: consultId,
        resource_type: TYPE_CONSULT,
      })
    }

    /**
     * 用户咨询项目是否已提醒作者
     *
     * @param {number} consultId
     * @return {boolean}
     */
    async hasCreateConsultRemind(consultId) {

      const { project } = this.service

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
        hasParentRemind = await this.remindService.hasCreateRemind(record.id, parentConsult.user_id)
      }

      const hasDemandRemind = await this.remindService.hasCreateRemind(record.id, demand.user_id)

      return hasDemandRemind && hasParentRemind

    }

    /**
     * 读取项目的咨询数
     *
     * @param {number} demandId
     * @param {?number} creatorId
     * @return {number}
     */
    async getCreateConsultCount(demandId, creatorId) {
      const where = {
        resource_master_id: demandId,
        resource_type: TYPE_CONSULT,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceCount(where)
    }

    /**
     * 获取项目的咨询列表
     *
     * @param {number} demandId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateConsultList(demandId, creatorId, options) {
      const where = {
        resource_master_id: demandId,
        resource_type: TYPE_CONSULT,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceList(where, options)
    }

    /**
     * 获取用户被咨询项目的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateConsultRemindList(receiverId, options) {
      return await this.remindService.getCreateRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_CONSULT,
        },
        options
      )
    }

    /**
     * 获取用户被咨询项目的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateConsultRemindCount(receiverId) {
      return await this.remindService.getCreateRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_CONSULT,
      })
    }

    /**
     * 获取用户被咨询项目的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateConsultUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadCreateRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_CONSULT,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readCreateConsultRemind(receiverId) {
      return await this.remindService.readCreateRemind({
        receiver_id: receiverId,
        resource_type: TYPE_CONSULT,
      })
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
      return await this.hasTrace({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
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

      const { qa } = this.service

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

          await this.remindService.addCreateRemind(row)

          if (rootReply) {
            row.receiver_id = rootReply.user_id
            await this.remindService.addCreateRemind(row)
          }

          if (parentReply && rootId !== parentId) {
            row.receiver_id = parentReply.user_id
            await this.remindService.addCreateRemind(row)
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

          await this.remindService.removeCreateRemind(record.id, question.user_id)

          if (reply.root_id) {
            const rootReply = await await qa.reply.checkReplyAvailableById(reply.root_id)
            await this.remindService.removeCreateRemind(record.id, rootReply.user_id)
          }

          if (reply.parent_id && reply.parent_id !== reply.root_id) {
            const parentReply = await await qa.reply.checkReplyAvailableById(reply.parent_id)
            await this.remindService.removeCreateRemind(record.id, parentReply.user_id)
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
      return await this.hasTrace({
        resource_id: replyId,
        resource_type: TYPE_REPLY,
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
        hasRootRemind = await this.remindService.hasCreateRemind(record.id, rootReply.user_id)
      }

      let hasParentRemind = true
      if (reply.parent_id && reply.parent_id !== reply.root_id) {
        const parentReply = await qa.reply.checkReplyAvailableById(reply.parent_id)
        hasParentRemind = await this.remindService.hasCreateRemind(record.id, parentReply.user_id)
      }

      const hasQuestionRemind = await this.remindService.hasCreateRemind(record.id, question.user_id)

      return hasQuestionRemind && hasRootRemind && hasParentRemind

    }

    /**
     * 读取问题的回复数
     *
     * @param {number} questionId
     * @param {?number} creatorId
     * @return {number}
     */
    async getCreateReplyCount(questionId, creatorId) {
      const where = {
        resource_master_id: questionId,
        resource_type: TYPE_REPLY,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceCount(where)
    }

    /**
     * 获取问题的回复列表
     *
     * @param {number} questionId
     * @param {?number} creatorId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateReplyList(questionId, creatorId, options) {
      const where = {
        resource_master_id: questionId,
        resource_type: TYPE_REPLY,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      return await this.getTraceList(where, options)
    }

    /**
     * 获取用户被回复问题的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateReplyRemindList(receiverId, options) {
      return await this.remindService.getCreateRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_REPLY,
        },
        options
      )
    }

    /**
     * 获取用户被回复问题的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getCreateAnswerRemindList(receiverId, options) {
      return await this.remindService.getCreateRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_REPLY,
          resource_parent_id: 0,
        },
        options
      )
    }

    /**
     * 获取用户被回复问题的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateReplyRemindCount(receiverId) {
      return await this.remindService.getCreateRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 获取用户被回复问题的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateAnswerRemindCount(receiverId) {
      return await this.remindService.getCreateRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
        resource_parent_id: 0,
      })
    }

    /**
     * 获取用户被回复问题的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateReplyUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadCreateRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 获取用户被回答的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getCreateAnswerUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadCreateRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
        resource_parent_id: 0,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readCreateReplyRemind(receiverId) {
      return await this.remindService.readCreateRemind({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readCreateAnswerRemind(receiverId) {
      return await this.remindService.readCreateRemind({
        receiver_id: receiverId,
        resource_type: TYPE_REPLY,
        resource_parent_id: 0,
      })
    }

  }
  return Create
}
