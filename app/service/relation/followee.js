
'use strict'

// 正常
const STATUS_NORMAL = 0
// 已删除
const STATUS_DELETED = 1

module.exports = app => {

  const { code, redis, } = app

  class Followee extends app.BaseService {

    get tableName() {
      return 'relation_followee'
    }

    get fields() {
      return [
        'user_id', 'followee_id', 'type', 'status',
      ]
    }

    /**
     * 获取某个用户的关注列表
     */
    async findByUserId(userId) {

    }

    /**
     * 获取某个用户的关注数量
     *
     * @param {number} userId
     */
    async countByUserId(userId) {
      return await redis.hget(`user_stat:${userId}`, 'followee_count') || 0
    }

    /**
     * user id 是否已关注 followee id
     *
     * @param {number} userId
     * @param {number} followeeId
     * @return {boolean}
     */
    async hasFollow(userId, followeeId) {
      const score = await redis.zscore(`followees:${userId}`, followeeId)
      return score ? true : false
    }

    /**
     * 关注用户
     *
     * @param {number} userId
     */
    async followUser(userId) {

      const { account, relation } = this.service

      // 确定用户存在
      await account.user.checkUserExisted(userId)

      // 确定自己已登录
      const currentUser = await account.session.checkCurrentUser()

      if (userId === currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '不能关注自己'
        )
      }

      const followee = await this.findOneBy({
        user_id: currentUser.id,
        followee_id: userId,
      })

      if (followee && followee.status !== STATUS_DELETED) {
        this.throw(
          code.RESOURCE_EXISTS,
          '已关注，无需再次关注'
        )
      }

      const isSuccess = await this.transaction(
        async () => {
          if (followee) {
            await this.update(
              {
                status: STATUS_NORMAL,
              },
              {
                id: followee.id,
              }
            )
          }
          else {
            const followeeId = await this.insert({
              user_id: currentUser.id,
              followee_id: userId,
            })
            if (followeeId == null) {
              this.throw(
                code.DB_INSERT_ERROR,
                '关注失败'
              )
            }
          }

          await relation.follower.addFollower(userId, currentUser.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_ERROR,
          '关注失败'
        )
      }

      await redis.hincrby(`user_stat:${currentUser.id}`, 'followee_count', 1)
      await redis.hincrby(`user_stat:${userId}`, 'follower_count', 1)

      const now = Date.now()

      // 关注列表
      await redis.zadd(
        `followees:${currentUser.id}`,
        now,
        userId
      )

      // 粉丝列表
      await redis.zadd(
        `followers:${userId}`,
        now,
        currentUser.id
      )

    }

    /**
     * 取消关注用户
     *
     * @param {number} userId
     */
    async unfollowUser(userId) {

      const { account, relation } = this.service

      // 确定用户存在
      await account.user.checkUserExisted(userId)

      // 确定自己已登录
      const currentUser = await account.session.checkCurrentUser()

      // 确定已关注
      const followee = await this.findOneBy({
        user_id: currentUser.id,
        followee_id: userId,
      })

      if (!followee || followee.status === STATUS_DELETED) {
        this.throw(
          code.RESOURCE_EXISTS,
          '未关注，无法取消关注'
        )
      }

      const isSuccess = await this.transaction(
        async () => {
          await this.update(
            {
              status: STATUS_DELETED,
            },
            {
              id: followee.id,
            }
          )
          await relation.follower.removeFollower(userId, currentUser.id)
          return true
        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_ERROR,
          '取消关注失败'
        )
      }

      await redis.hincrby(`user_stat:${currentUser.id}`, 'followee_count', -1)
      await redis.hincrby(`user_stat:${userId}`, 'follower_count', -1)

      // 关注列表
      await redis.zrem(
        `followees:${currentUser.id}`,
        userId
      )

      // 粉丝列表
      await redis.zrem(
        `followers:${userId}`,
        currentUser.id
      )

    }

  }
  return Followee
}
