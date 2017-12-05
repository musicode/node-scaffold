
'use strict'

const STATUS_ACTIVE = 0
const STATUS_AUDIT_SUCCESS = 1
const STATUS_AUDIT_FAIL = 2
const STATUS_DELETED = 3

module.exports = app => {

  const { code, util, limit, redis, config, eventEmitter } = app

  class Comment extends app.BaseService {

    get tableName() {
      return 'article_comment'
    }

    get fields() {
      return [
        'number', 'user_id', 'post_id', 'parent_id', 'anonymous', 'status',
      ]
    }

    async toExternal(comment) {

      if (!('content' in comment)) {
        comment = await this.getFullCommentById(comment)
      }

      const result = { }
      Object.assign(result, comment)

      const { id, number, user_id, post_id, parent_id, anonymous } = result
      delete result.number
      delete result.user_id
      delete result.post_id
      delete result.parent_id
      delete result.anonymous

      result.id = number

      const { account, article, trace, } = this.service

      const currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        if (currentUser.id === user_id) {
          result.can_update = true
          const subCount = await this.getCommentSubCount(id)
          result.can_delete = subCount === 0
        }
      }

      if (anonymous === limit.ANONYMOUS_YES) {
        result.user = account.user.anonymous
      }
      else {
        const user = await account.user.getFullUserById(user_id)
        result.user = await account.user.toExternal(user)
      }

      if (parent_id) {
        const parentComment = await this.getCommentById(parent_id)
        result.parent_id = parentComment.number

        if (parentComment.anonymous === limit.ANONYMOUS_YES) {
          result.parent_user = account.user.anonymous
        }
        else {
          const parentUser = await account.user.getFullUserById(parentComment.user_id)
          result.parent_user = await account.user.toExternal(parentUser)
        }
      }

      const post = await article.post.getFullPostById(post_id)
      result.post = await article.post.toExternal(post)

      result.create_time = result.create_time.getTime()
      result.update_time = result.update_time.getTime()

      return result

    }

    /**
     * 检查评论是否是对外可用状态
     *
     * @param {number|Object} commentId 评论 id
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkCommentAvailableById(commentId, checkStatus) {

      let comment
      if (commentId && commentId.id) {
        comment = commentId
        commentId = comment.id
      }

      if (!comment && commentId) {
        comment = await this.getCommentById(commentId)
      }

      if (comment
        && (!checkStatus
        || comment.status === STATUS_ACTIVE
        || comment.status === STATUS_AUDIT_SUCCESS)
      ) {
        return comment
      }

      this.throw(
        code.RESOURCE_NOT_FOUND,
        '该评论不存在'
      )

    }

    /**
     * 检查评论是否是对外可用状态
     *
     * @param {number} commentNumber 评论 number
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkCommentAvailableByNumber(commentNumber, checkStatus) {

      const comment = await this.findOneBy({
        number: commentNumber,
      })

      return await this.checkCommentAvailableById(comment, checkStatus)

    }

    /**
     * 通过 id 获取评论
     *
     * @param {number|Object} commentId
     * @return {Object}
     */
    async getCommentById(commentId) {

      let comment
      if (commentId && commentId.id) {
        comment = commentId
        commentId = comment.id
      }

      if (!comment) {
        comment = await this.findOneBy({ id: commentId })
      }

      return comment

    }

    /**
     * 获取评论的完整信息
     *
     * @param {number|Object} commentId
     * @return {Object}
     */
    async getFullCommentById(commentId) {

      const { article } = this.ctx.service

      const comment = await this.getCommentById(commentId)

      const record = await article.commentContent.findOneBy({
        comment_id: comment.id,
      })

      comment.sub_count = await this.getCommentSubCount(comment.id)

      comment.content = record.content
      if (record.update_time.getTime() > comment.update_time.getTime()) {
        comment.update_time = record.update_time
      }

      return comment

    }

    /**
     * 创建评论
     *
     * @param {Object} data
     * @property {string} data.content
     * @property {number} data.post_id
     * @property {number} data.parent_id
     * @property {anonymous} data.anonymous
     */
    async createComment(data) {

      const { account, article, trace } = this.service

      if (!data.post_id) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 post_id'
        )
      }

      if (!data.content) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 content'
        )
      }

      const currentUser = await account.session.checkCurrentUser();

      const commentId = await this.transaction(
        async () => {

          const number = await this.createNumber(limit.COMMENT_NUMBER_LENGTH)
          const anonymous = data.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO

          const row = {
            number,
            user_id: currentUser.id,
            post_id: data.post_id,
            anonymous,
          }

          if (data.parent_id) {
            row.parent_id = data.parent_id
          }

          const commentId = await this.insert(row)

          await article.commentContent.insert({
            comment_id: commentId,
            content: data.content,
          })

          await trace.create.createComment(commentId, anonymous, data.post_id, data.parent_id)

          return commentId

        }
      )

      if (commentId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '新增评论失败'
        )
      }

      await article.post.increasePostSubCount(data.post_id)

      if (data.parent_id) {
        await this.increaseCommentSubCount(data.parent_id)
      }

      eventEmitter.emit(
        eventEmitter.COMMENT_ADD,
        {
          commentId,
          service: this.service,
        }
      )

      return commentId

    }


    /**
     * 修改评论
     *
     * @param {Object} data
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @param {number|Object} commentId
     */
    async updateCommentById(data, commentId) {

      const { account, article, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const comment = await this.getCommentById(commentId)

      if (comment.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '没有权限修改该评论'
        )
      }

      const { content } = data

      let fields = this.getFields(data)

      await this.transaction(
        async () => {

          if (fields) {
            if ('anonymous' in fields) {
              fields.anonymous = fields.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO
              if (fields.anonymous === post.anonymous) {
                delete fields.anonymous
              }
            }
            if (Object.keys(fields).length) {
              await this.update(
                fields,
                {
                  id: comment.id,
                }
              )
            }
            else {
              fields = null
            }
          }

          if (content) {
            await article.commentContent.update(
              {
                content,
              },
              {
                comment_id: comment.id,
              }
            )
          }

          if (fields && 'anonymous' in fields) {
            await trace.create.createComment(comment.id, fields.anonymous, comment.post_id, comment.parent_id)
          }

        }
      )

      if (fields && content) {
        eventEmitter.emit(
          eventEmitter.COMMENT_UDPATE,
          {
            commentId: comment.id,
            service: this.service,
          }
        )
      }

    }

    /**
     * 删除评论
     *
     * @param {number|Object} commentId
     */
    async deleteComment(commentId) {

      const { account, article, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const comment = await this.getCommentById(commentId)

      if (comment.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '不能删除别人的评论'
        )
      }

      const subCount = await this.getCommentSubCount(comment.id)
      if (subCount > 0) {
        this.throw(
          code.PERMISSION_DENIED,
          '已有评论的评论不能删除'
        )
      }

      const fields = {
        status: STATUS_DELETED,
      }

      const isSuccess = await this.transaction(
        async () => {

          await this.update(
            fields,
            {
              id: comment.id,
            }
          )

          await trace.create.uncreateComment(comment.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '删除评论失败'
        )
      }

      await article.post.decreasePostSubCount(comment.post_id)

      if (comment.parent_id) {
        await this.decreaseCommentSubCount(comment.parent_id)
      }

      eventEmitter.emit(
        eventEmitter.COMMENT_UDPATE,
        {
          commentId: comment.id,
          service: this.service,
        }
      )

    }

    /**
     * 浏览评论
     *
     * @param {number|Object} commentId
     * @return {Object}
     */
    async viewComment(commentId) {

      if (!config.commentViewByGuest) {
        const { account } = this.service
        const currentUser = await account.session.getCurrentUser()
        if (!currentUser) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览评论'
          )
        }
      }

      const comment = await this.getCommentById(commentId)

      return await this.getFullCommentById(comment)

    }

    /**
     * 获得评论列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getCommentList(where, options) {
      this._formatWhere(where)
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获得评论数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getCommentCount(where) {
      this._formatWhere(where)
      return await this.countBy(where)
    }

    /**
     * 格式化查询条件
     *
     * @param {Object} where
     */
    _formatWhere(where) {
      if ('status' in where) {
        if (where.status < 0) {
          delete where.status
        }
      }
      else {
        where.status = [ STATUS_ACTIVE, STATUS_AUDIT_SUCCESS ]
      }
    }



    /**
     * 递增评论的评论量
     *
     * @param {number} commentId
     */
    async increaseCommentSubCount(commentId) {
      const key = `comment_stat:${commentId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', 1)
      }
    }

    /**
     * 递减评论的评论量
     *
     * @param {number} commentId
     */
    async decreaseCommentSubCount(commentId) {
      const key = `comment_stat:${commentId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', -1)
      }
    }

    /**
     * 获取评论的评论量
     *
     * @param {number} commentId
     * @return {number}
     */
    async getCommentSubCount(commentId) {
      const key = `comment_stat:${commentId}`
      let subCount = await redis.hget(key, 'sub_count')
      if (subCount == null) {
        subCount = await this.getCommentCount({
          parent_id: commentId,
        })
        await redis.hset(key, 'sub_count', subCount)
      }
      else {
        subCount = util.toNumber(subCount, 0)
      }
      return subCount
    }

  }
  return Comment
}
