
'use strict'

const STATUS_UNREAD = 0
const STATUS_READED = 1
const STATUS_DELETED = 2

const BaseService = require('../base')

class BaseRemindService extends BaseService {

  get STATUS_UNREAD() {
    return STATUS_UNREAD
  }

  get STATUS_READED() {
    return STATUS_READED
  }

  get STATUS_DELETED() {
    return STATUS_DELETED
  }

  async toExternal(record) {

    let trace = await this.traceService.findOneBy({
      id: record.trace_id,
    })

    trace = await this.traceService.toExternal(trace)

    return {
      id: record.id,
      type: trace.type,
      resource: trace.resource,
      parent: trace.parent,
      master: trace.master,
      status: record.status,
      sender: trace.creator,
      create_time: record.update_time.getTime(),
    }
  }

  /**
   * 添加提醒
   *
   * @param {Object} data
   * @property {number} data.trace_id
   * @property {number} data.sender_id
   * @property {number} data.receiver_id
   * @property {number} data.resource_type
   */
  async addRemind(data) {

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
   * 取消提醒
   *
   * @param {number} traceId
   * @param {number} receiverId
   */
  async removeRemind(traceId, receiverId) {

    const where = {
      trace_id: traceId,
    }

    if (receiverId != null) {
      where.receiver_id = receiverId
    }

    const record = await this.findOneBy(where)

    if (record && record.status !== STATUS_DELETED) {
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
   * 是否已提醒
   *
   * @param {number} traceId
   * @param {number} receiverId
   * @return {boolean}
   */
  async hasRemind(traceId, receiverId) {

    const where = {
      trace_id: traceId,
    }

    if (receiverId != null) {
      where.receiver_id = receiverId
    }

    const record = await this.findOneBy(where)

    return record && record.status !== STATUS_DELETED ? true : false

  }

  /**
   * 获取提醒列表
   *
   * @param {Object} where
   * @param {Object} options
   * @return {Array}
   */
  async getRemindList(where, options) {

    where.status = [ STATUS_UNREAD, STATUS_READED ]

    options.where = where

    return await this.findBy(options)

  }

  /**
   * 获取提醒数量
   *
   * @param {Object} where
   * @return {number}
   */
  async getRemindCount(where) {

    where.status = [ STATUS_UNREAD, STATUS_READED ]

    return await this.countBy(where)

  }

  /**
   * 获取未读提醒数量
   *
   * @param {Object} where
   * @return {number}
   */
  async getUnreadRemindCount(where) {

    where.status = STATUS_UNREAD

    return await this.countBy(where)

  }

  /**
   * 标记已读
   *
   * @param {Object} where
   */
  async readRemind(where) {

    const { code, util } = this.app

    // https://github.com/ali-sdk/ali-rds/issues/42
    let sql = 'UPDATE ?? SET `status` = ?'

    where.status = STATUS_UNREAD

    where = util.formatWhere(where)
    if (!where) {
      this.throw(
        code.INNER_ERROR,
        'readRemind 没有 where'
      )
    }

    sql += ' WHERE ' + where.sql

    const values = [
      this.tableName,
      STATUS_READED,
      ...where.values,
    ]

    await this.query(sql, values)

  }

}

module.exports = BaseRemindService
