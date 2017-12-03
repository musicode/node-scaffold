
'use strict'

const STATUS_UNREAD = 0
const STATUS_READED = 1
const STATUS_DELETED = 2

module.exports = app => {

  const { code, } = app

  class FollowRemind extends app.BaseService {

    get tableName() {
      return 'trace_follow_remind'
    }

    get fields() {
      return [
        'trace_id', 'sender_id', 'receiver_id',
        'resource_type', 'status'
      ]
    }

    /**
     * 关注提醒
     *
     * @param {Object} data
     * @property {number} data.trace_id
     * @property {number} data.sender_id
     * @property {number} data.receiver_id
     * @property {number} data.resource_type
     */
    async addFollowRemind(data) {

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
     * 取消关注提醒
     *
     * @param {number} traceId
     */
    async removeFollowRemind(traceId) {

      const hasFollowRemind = await this.hasFollowRemind(traceId)

      if (hasFollowRemind) {
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
     * 是否已提醒关注
     *
     * @param {number} traceId
     * @return {boolean}
     */
    async hasFollowRemind(traceId) {

      const record = await this.findOneBy({
        trace_id: traceId,
      })

      return record && record.status !== STATUS_DELETED ? true : false

    }

    /**
     * 获取用户被关注的提醒列表
     *
     * @param {number} receiverId
     * @param {number} resourceType
     * @param {Object} options
     * @return {Array}
     */
    async getFollowRemindList(receiverId, resourceType, options) {

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
     * 获取用户被关注的提醒数量
     *
     * @param {number} receiverId
     * @param {number} resourceType
     * @return {number}
     */
    async getFollowRemindCount(receiverId, resourceType) {

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
     * 获取用户被关注的未读提醒数量
     *
     * @param {number} receiverId
     * @param {number} resourceType
     * @return {number}
     */
    async getUnreadFollowRemindCount(receiverId, resourceType) {

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
    async readFollowRemind(receiverId, resourceType) {

      const where = {
        receiver_id: receiverId,
        // [TODO]这里 ali-rds 有 bug，修复后需要加回来
        // status: STATUS_UNREAD,
      }

      if (resourceType != null) {
        where.resource_type = resourceType
      }

      await this.update(
        {
          status: STATUS_READED,
        },
        where
      )
    }

  }
  return FollowRemind
}
