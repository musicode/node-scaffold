'use strict'

// 正常
const STATUS_NORMAL = 0
// 已拉黑
const STATUS_BLACK = 1
// 已删除
const STATUS_DELETED = 2

// [TODO] redis 字段没有怎么恢复

module.exports = app => {

  const { code, redis, } = app

  class Follower extends app.BaseService {

    get tableName() {
      return 'relation_follower'
    }

    get fields() {
      return [
        'user_id', 'follower_id', 'status',
      ]
    }

    /**
     * 获取某个用户的粉丝列表
     */
    async findByUserId(userId) {

    }

    /**
     * 获取某个用户的粉丝数量
     *
     * @param {number} userId
     */
    async countByUserId(userId) {
      const key = `user_stat:${userId}`
      let count = await redis.hget(key, 'follower_count')
      if (!count && count !== 0) {
        const list = await this.query(
          'SELECT COUNT(*) AS count FROM ? WHERE user_id=? AND status=?',
          [this.tableName, userId, STATUS_NORMAL]
        )
        count = list[0].count
        await redis.hset(key, 'follower_count', count)
      }
      return count
    }

    /**
     * 递增粉丝数
     *
     * @param {number} userId
     */
    async increaseCount(userId) {

      // 防止出现 redis 挂了，取不到值又从 0 开始了
      await this.countByUserId(userId)

      await redis.hincrby(`user_stat:${userId}`, 'follower_count', 1)

    }

    /**
     * 递减粉丝数
     *
     * @param {number} userId
     */
    async decreaseCount(userId) {

      // 防止出现 redis 挂了，取不到值又从 0 开始了
      await this.countByUserId(userId)

      await redis.hincrby(`user_stat:${userId}`, 'follower_count', -1)

    }

    /**
     * 给 user 添加新的粉丝
     *
     * @param {number} userId
     * @param {number} followerId
     */
    async addFollower(userId, followerId) {
      const follower = await this.findOneBy({
        user_id: userId,
        follower_id: followerId,
      })
      if (follower) {
        if (follower.status === STATUS_DELETED) {
          await this.update(
            {
              status: STATUS_NORMAL,
            },
            {
              id: follower.id,
            }
          )
        }
      }
      else {
        this.insert({
          user_id: userId,
          follower_id: followerId,
        })
      }
    }

    /**
     * 删除 user 的粉丝
     *
     * @param {number} userId
     * @param {number} followerId
     */
    async removeFollower(userId, followerId) {
      await this.update(
        {
          status: STATUS_DELETED,
        },
        {
          user_id: userId,
          follower_id: followerId,
        }
      )
    }

  }
  return Follower
}
