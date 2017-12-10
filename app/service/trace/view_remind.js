
'use strict'

const BaseRemindService = require('./base_remind')

module.exports = app => {

  class ViewRemind extends BaseRemindService {

    get tableName() {
      return 'trace_view_remind'
    }

    get fields() {
      return [
        'trace_id', 'sender_id', 'receiver_id',
        'resource_type', 'status'
      ]
    }

    get traceService() {
      return this.service.trace.view
    }

    /**
     * 浏览提醒
     *
     * @param {Object} data
     * @property {number} data.trace_id
     * @property {number} data.sender_id
     * @property {number} data.receiver_id
     * @property {number} data.resource_type
     */
    async addViewRemind(data) {
      await this.addRemind(data)
    }

    /**
     * 是否已提醒浏览
     *
     * @param {number} traceId
     * @return {boolean}
     */
    async hasViewRemind(traceId) {
      return await this.hasRemind(traceId)
    }

    /**
     * 获取用户被浏览的提醒列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getViewRemindList(where, options) {
      return await this.getRemindList(where, options)
    }

    /**
     * 获取用户被浏览的提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getViewRemindCount(where) {
      return await this.getRemindCount(where)
    }

    /**
     * 获取用户被浏览的未读提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getUnreadViewRemindCount(where) {
      return await this.getUnreadRemindCount(where)
    }

    /**
     * 标记已读
     *
     * @param {Object} where
     */
    async readViewRemind(where) {
      return await this.readRemind(where)
    }

  }
  return ViewRemind
}
