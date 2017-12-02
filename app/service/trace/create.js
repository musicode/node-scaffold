
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

      const row = {
        resource_id: commentId,
        resource_type: TYPE_COMMENT,
        resource_master_id: postId,
        anonymous,
      }

      if (parentId) {
        row.resource_parent_id = parentId
      }

      const traceId = await this._addCreate(row)

      if (traceId == null) {
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

      const record = await this._removeCreate({
        resource_id: commentId,
        resource_type: TYPE_COMMENT,
      })

      if (record == null) {
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

  }
  return Create
}
