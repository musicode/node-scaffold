
'use strict'

const STATUS_UNREAD = 0
const STATUS_READED = 1
const STATUS_DELETED = 2

module.exports = app => {

  const { code, } = app

  class InviteRemind extends app.BaseService {

    get tableName() {
      return 'trace_invite_remind'
    }

    get fields() {
      return [
        'trace_id', 'sender_id', 'receiver_id',
        'resource_type', 'status'
      ]
    }

    /**
     * 邀请提醒
     *
     * @param {Object} data
     * @property {number} data.trace_id
     * @property {number} data.sender_id
     * @property {number} data.receiver_id
     * @property {number} data.resource_type
     */
    async addInviteRemind(data) {

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
     * 取消邀请提醒
     *
     * @param {number} traceId
     */
    async removeInviteRemind(traceId) {

      const hasInviteRemind = await this.hasInviteRemind(traceId)

      if (hasInviteRemind) {
        await this.update(
          {
            status: STATUS_DELETED,
          },
          {
            trace_id: traceId,
          }
        )
      }

    }

    /**
     * 是否已提醒邀请
     *
     * @param {number} traceId
     * @return {boolean}
     */
    async hasInviteRemind(traceId) {

      const record = await this.findOneBy({
        trace_id: traceId,
      })

      return record && record.status !== STATUS_DELETED ? true : false

    }

    /**
     * 获取用户被邀请的提醒列表
     *
     * @param {number} receiverId
     * @param {number} resourceType
     * @param {Object} options
     * @return {Array}
     */
    async getInviteRemindList(receiverId, resourceType, options) {

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
     * 获取用户被邀请的提醒数量
     *
     * @param {number} receiverId
     * @param {number} resourceType
     * @return {number}
     */
    async getInviteRemindCount(receiverId, resourceType) {

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
     * 获取用户被邀请的未读提醒数量
     *
     * @param {number} receiverId
     * @param {number} resourceType
     * @return {number}
     */
    async getUnreadInviteRemindCount(receiverId, resourceType) {

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
    async readInviteRemind(receiverId, resourceType) {

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
  return InviteRemind
}
