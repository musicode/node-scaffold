
'use strict'

const BaseRemindService = require('./remind')

module.exports = app => {

  const { code, } = app

  class CreateRemind extends BaseRemindService {

    get tableName() {
      return 'trace_create_remind'
    }

    get fields() {
      return [
        'trace_id', 'sender_id', 'receiver_id',
        'resource_parent_id', 'resource_type', 'status'
      ]
    }

    get traceService() {
      return this.service.trace.create
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
      await this.addRemind(data)
    }

    /**
     * 取消创建提醒
     *
     * @param {number} traceId
     * @param {number} receiverId
     */
    async removeCreateRemind(traceId, receiverId) {
      await this.removeRemind(traceId, receiverId)
    }

    /**
     * 是否已提醒创建
     *
     * @param {number} traceId
     * @param {number} receiverId
     * @return {boolean}
     */
    async hasCreateRemind(traceId, receiverId) {
      return await this.hasRemind(traceId, receiverId)
    }

    /**
     * 获取用户被创建的提醒列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getCreateRemindList(where, options) {
      return await this.getRemindList(where, options)
    }

    /**
     * 获取用户被创建的提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getCreateRemindCount(where) {
      return await this.getRemindCount(where)
    }

    /**
     * 获取用户被创建的未读提醒数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getUnreadCreateRemindCount(where) {
      return await this.getUnreadRemindCount(where)
    }

    /**
     * 标记已读
     *
     * @param {Object} where
     */
    async readCreateRemind(where) {
      await this.readRemind(where)
    }

  }
  return CreateRemind
}
