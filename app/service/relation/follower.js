'use strict'

// 正常
const STATUS_NORMAL = 0
// 已拉黑
const STATUS_BLACK = 1
// 已删除
const STATUS_DELETED = 2

module.exports = app => {

  const { code } = app

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
     * 获取某个用户的粉丝数量
     *
     * @param {number} userId
     * @param {Object} options
     */
    async getFollowerCount(userId) {
      const { account } = this.service
      return await account.user.getUserFollowerCount(userId)
    }

    /**
     * 获取某个用户的粉丝列表
     *
     * @param {number} userId
     * @param {Object} options
     */
    async getFollowerList(userId, options) {
      options.where = {
        user_id: userId,
        status: STATUS_NORMAL,
      }
      return await this.findBy(options)
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
