
'use strict'

const STATUS_UNREAD = 0
const STATUS_READED = 1
const STATUS_DELETED = 2

module.exports = app => {

  const { code, } = app

  class CreateRemind extends app.BaseService {

    get tableName() {
      return 'trace_create_remind'
    }

    get fields() {
      return [
        'trace_id', 'sender_id', 'receiver_id',
        'resource_parent_id', 'resource_type', 'status'
      ]
    }

    /**
     * 创建提醒
     *
     * @param {Object} data
     * @property {number} data.trace_id
     * @property {number} data.sender_id
     * @property {number} data.receiver_id
     * @property {number} data.resource_type
     * @property {number} data.resource_parent_id
     */
    async addCreateRemind(data) {

      const record = await this.findOneBy({
        trace_id: data.trace_id,
      })

      // 如果已经存在该记录
      // 改成未读状态
      if (record) {
        if (record.status !== STATUS_UNREAD) {
          await this.update(
            {
              status: STATUS_UNREAD,
            },
            {
              id: record.id,
            }
          )
        }
      }
      else {
        if (data.sender_id !== data.receiver_id) {
          await this.insert(data)
        }
      }

    }

    /**
     * 取消创建提醒
     *
     * @param {number} receiverId
     * @param {number} traceId
     */
    async removeCreateRemind(receiverId, traceId) {

      const record = await this.findOneBy({
        receiver_id: receiverId,
        trace_id: traceId,
      })

      if (record) {
        await this.update(
          {
            status: STATUS_DELETED,
          },
          {
            id: record.id,
          }
        )
      }

    }

    /**
     * 是否已提醒创建
     *
     * @param {number} receiverId
     * @param {number} traceId
     * @return {boolean}
     */
    async hasCreateRemind(receiverId, traceId) {

      const record = await this.findOneBy({
        receiver_id: receiverId,
        trace_id: traceId,
      })

      return record && record.status !== STATUS_DELETED ? true : false

    }

    /**
     * 获取用户被创建的提醒列表
     *
     * @param {number} receiverId
     * @param {number} resourceType
     * @param {Object} options
     * @return {Array}
     */
    async getCreateRemindList(receiverId, resourceType, options) {

      const where = {
        receiver_id: receiverId,
        status: [ STATUS_UNREAD, STATUS_READED ],
      }

      if (resourceType != null) {
        where.resource_type = resourceType
      }

      options.where = where

      return await this.findBy(options)

    }

    /**
     * 获取用户被创建的提醒数量
     *
     * @param {number} receiverId
     * @param {number} resourceType
     * @return {number}
     */
    async getCreateRemindCount(receiverId, resourceType) {

      const where = {
        receiver_id: receiverId,
        status: [ STATUS_UNREAD, STATUS_READED ],
      }

      if (resourceType != null) {
        where.resource_type = resourceType
      }

      return await this.countBy(where)

    }

    /**
     * 获取用户被创建的未读提醒数量
     *
     * @param {number} receiverId
     * @param {number} resourceType
     * @return {number}
     */
    async getUnreadCreateRemindCount(receiverId, resourceType) {

      const where = {
        receiver_id: receiverId,
        status: STATUS_UNREAD,
      }

      if (resourceType != null) {
        where.resource_type = resourceType
      }

      return await this.countBy(where)

    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     * @param {number} resourceType
     */
    async readCreateRemind(receiverId, resourceType) {

      // https://github.com/ali-sdk/ali-rds/issues/42
      let sql = `
        UPDATE \`${this.tableName}\` SET \`status\` = ${STATUS_READED} WHERE \`receiver_id\` = ${receiverId} AND \`status\` = ${STATUS_UNREAD}
      `

      if (resourceType != null) {
        sql += ` AND \`resource_type\` = ${resourceType}`
      }

      await this.query(sql)

    }

  }
  return CreateRemind
}
