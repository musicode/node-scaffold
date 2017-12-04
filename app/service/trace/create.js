
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

  }
  return Create
}
