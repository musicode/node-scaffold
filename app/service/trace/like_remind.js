
'use strict'

const BaseRemindService = require('./base_remind')

module.exports = app => {

  class LikeRemind extends BaseRemindService {

    get tableName() {
      return 'trace_like_remind'
    }

    get fields() {
      return [
        'trace_id', 'sender_id', 'receiver_id',
        'resource_parent_id', 'resource_type', 'status'
      ]
    }

    get traceService() {
      return this.service.trace.like
    }

    /**
     * 点赞提醒
     *
     * @param {Object} data
     * @property {number} data.trace_id
     * @property {number} data.sender_id
     * @property {number} data.receiver_id
     * @property {number} data.resource_type
     * @property {number} data.resource_parent_id
     */
    async addLikeRemind(data) {
      await this.addRemind(data)
    }

    /**
     * 取消点赞提醒
     *
     * @param {number} traceId
     */
    async removeLikeRemind(traceId) {
      await this.removeRemind(traceId)
    }

    /**
     * 是否已提醒点赞
     *
     * @param {number} traceId
     * @return {boolean}
     */
    async hasLikeRemind(traceId) {
      return await this.hasRemind(traceId)
    }

    /**
     * 获取用户被点赞的提醒列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getLikeRemindList(where, options) {
      return await this.getRemindList(where, options)
    }

    /**
     * 获取用户被点赞的提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getLikeRemindCount(where) {
      return await this.getRemindCount(where)
    }

    /**
     * 获取用户被点赞的未读提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getUnreadLikeRemindCount(where) {
      return await this.getUnreadRemindCount(where)
    }

    /**
     * 标记已读
     *
     * @param {Object} where
     */
    async readLikeRemind(where) {
      await this.readRemind(where)
    }

  }
  return LikeRemind
}
