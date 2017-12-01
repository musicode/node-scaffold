
'use strict'

const STATUS_ACTIVE = 0
const STATUS_AUDIT_SUCCESS = 1
const STATUS_AUDIT_FAIL = 2
const STATUS_DELETED = 3

module.exports = app => {

  class Comment extends app.BaseService {

    get tableName() {
      return 'article_comment'
    }

    get fields() {
      return [
        'number', 'user_id', 'post_id', 'parent_id', 'anonymous', 'status',
      ]
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
        comment = await this.findOneBy({
          id: commentId,
        })
      }

      return comment

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
     * 创建评论
     *
     * @param {Object} data
     * @property {string} data.content
     * @property {number} data.post_id
     * @property {number} data.parent_id
     * @property {anonymous} data.anonymous
     */
    async createComment(data) {

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

      const { account, article } = this.service

      const currentUser = await account.session.checkCurrentUser();

      const commentId = await this.transaction(
        async () => {

          const row = {
            number: util.randomInt(limit.COMMENT_NUMBER_LENGTH),
            user_id: currentUser.id,
            anonymous: data.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO,
          }

          if (data.parent_id) {
            row.parent_id = data.parent_id
          }

          const commentId = await this.insert(row)

          data.comment_id = commentId

          await article.commentContent.insert({
            comment_id: commentId,
            content: data.content,
          })

          return commentId

        }
      )

      if (commentId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '新增评论失败'
        )
      }

    }

  }
  return Comment
}
