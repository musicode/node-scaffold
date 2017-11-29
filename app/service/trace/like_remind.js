
'use strict'

const STATUS_UNREAD = 0
const STATUS_READED = 1
const STATUS_DELETED = 2

module.exports = app => {

  const { code, redis, } = app

  class LikeRemind extends app.BaseService {

    get tableName() {
      return 'trace_like_remind'
    }

    get fields() {
      return [
        'trace_id', 'sender_id', 'receiver_id',
        'resource_parent_id', 'resource_type', 'status'
      ]
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

      const record = await this.findOneBy({
        trace_id: data.trace_id,
      })

      // 如果已经存在该记录
      // 改成未读状态
      if (record) {
        await this.update(
          {
            status: STATUS_UNREAD,
          },
          {
            id: record.id,
          }
        )
      }
      else {
        await this.insert(data)
      }

    }

    /**
     * 取消点赞提醒
     *
     * @param {number} traceId
     */
    async removeLikeRemind(traceId) {

      const hasLikeRemind = await this.hasLikeRemind(traceId)

      if (!hasLikeRemind) [
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '未提醒点赞，无法取消'
        )
      ]

      await this.update(
        {
          status: STATUS_DELETED,
        },
        {
          id: traceId,
        }
      )

    }

    /**
     * 是否已提醒点赞
     *
     * @param {number} traceId
     * @return {boolean}
     */
    async hasLikeRemind(traceId) {

      const record = await this.findOneBy({
        trace_id: traceId,
      })

      return record && record.status !== STATUS_DELETED ? true : false

    }


  }
  return LikeRemind
}
