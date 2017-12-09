
'use strict'

const BaseRemindService = require('./remind')

module.exports = app => {

  class FollowRemind extends BaseRemindService {

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
      await this.addRemind(data)
    }

    /**
     * 取消关注提醒
     *
     * @param {number} traceId
     */
    async removeFollowRemind(traceId) {
      await this.removeRemind(traceId)
    }

    /**
     * 是否已提醒关注
     *
     * @param {number} traceId
     * @return {boolean}
     */
    async hasFollowRemind(traceId) {
      return await this.hasRemind(traceId)
    }

    /**
     * 获取用户被关注的提醒列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getFollowRemindList(where, options) {
      return await this.getRemindList(where, options)
    }

    /**
     * 获取用户被关注的提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getFollowRemindCount(where) {
      return await this.getRemindCount(where)
    }

    /**
     * 获取用户被关注的未读提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getUnreadFollowRemindCount(where) {
      return await this.getUnreadRemindCount(where)
    }

    /**
     * 标记已读
     *
     * @param {Object} where
     */
    async readFollowRemind(where) {
      await this.readRemind(where)
    }

  }
  return FollowRemind
}
