
'use strict'

const BaseRemindService = require('./remind')

module.exports = app => {

  class InviteRemind extends BaseRemindService {

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
      await this.addRemind(data)
    }

    /**
     * 取消邀请提醒
     *
     * @param {number} traceId
     */
    async removeInviteRemind(traceId) {
      await this.removeRemind(traceId)
    }

    /**
     * 是否已提醒邀请
     *
     * @param {number} traceId
     * @return {boolean}
     */
    async hasInviteRemind(traceId) {
      return await this.hasRemind(traceId)
    }

    /**
     * 获取用户被邀请的提醒列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getInviteRemindList(where, options) {
      return await this.getRemindList(where, options)
    }

    /**
     * 获取用户被邀请的提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getInviteRemindCount(where) {
      return await this.getRemindCount(where)
    }

    /**
     * 获取用户被邀请的未读提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getUnreadInviteRemindCount(where) {
      return await this.getUnreadRemindCount(where)
    }

    /**
     * 标记已读
     *
     * @param {Object} where
     */
    async readInviteRemind(where) {
      await this.readRemind(where)
    }

  }
  return InviteRemind
}
