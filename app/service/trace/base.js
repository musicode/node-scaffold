
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
     * @param {number} creatorId
     * @param {number} resourceId
     * @param {number} resourceType
     * @return {boolean}
     */
    async hasTrace(creatorId, resourceId, resourceType) {

      const where = {
        resource_id: resourceId,
        resource_type: resourceType,
        status: STATUS_ACTIVE,
      }

      if (creatorId) {
        where.creator_id = creatorId
      }

      const record = await this.findOneBy(where)

      return record ? true : false

    }

    /**
     * 用户的某种行为是否已触发提醒
     *
     * @param {number} creatorId
     * @param {number} resourceId
     * @param {number} resourceType
     * @param {number} receiverId
     * @return {boolean}
     */
    async hasTraceRemind(creatorId, resourceId, resourceType, receiverId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: resourceId,
        resource_type: resourceType,
        creator_id: creatorId,
      })

      if (record) {
        return await this.remindService.hasRemind(record.id, receiverId)
      }

      return false

    }

    /**
     * 读取文章的浏览数
     *
     * @param {number} creatorId
     * @param {number} resourceId
     * @param {number} resourceType
     * @return {number}
     */
    async getTraceCount(creatorId, resourceId, resourceType) {
      const where = {
        resource_type: resourceType,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (resourceId) {
        where.resource_id = resourceId
      }
      return await this.countBy(where)
    }

    /**
     * 获取文章的浏览列表
     *
     * @param {number} creatorId
     * @param {number} resourceId
     * @param {number} resourceType
     * @param {Object} options
     * @return {Array}
     */
    async getTraceList(creatorId, resourceId, resourceType, options) {
      const where = {
        resource_type: resourceType,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (resourceId) {
        where.resource_id = resourceId
      }
      options.where = where
      return await this.findBy(options)
    }

}

module.exports = BaseTraceService
