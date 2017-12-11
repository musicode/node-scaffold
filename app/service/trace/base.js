
'use strict'

const STATUS_ACTIVE = 0
const STATUS_DELETED = 1

const BaseService = require('../base')

class BaseTraceService extends BaseService {

  get STATUS_ACTIVE() {
    return STATUS_ACTIVE
  }

  get STATUS_DELETED() {
    return STATUS_DELETED
  }

  /**
     * 用户是否已触发某种行为
     *
     * @param {Object} where
     * @return {boolean}
     */
    async hasTrace(where) {

      where.status = STATUS_ACTIVE

      const record = await this.findOneBy(where)

      return record ? true : false

    }

    /**
     * 用户的某种行为是否已触发提醒
     *
     * @param {Object} where
     * @param {number} receiverId
     * @return {boolean}
     */
    async hasTraceRemind(where, receiverId) {

      const { trace } = this.service

      const record = await this.findOneBy(where)

      if (record) {
        return await this.remindService.hasRemind(record.id, receiverId)
      }

      return false

    }

    /**
     * 读取文章的浏览数
     *
     * @param {Object} where
     * @return {number}
     */
    async getTraceCount(where) {
      where.status = STATUS_ACTIVE
      return await this.countBy(where)
    }

    /**
     * 获取文章的浏览列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getTraceList(where, options) {
      where.status = STATUS_ACTIVE
      options.where = where
      return await this.findBy(options)
    }

}

module.exports = BaseTraceService
