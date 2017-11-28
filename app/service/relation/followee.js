
'use strict'

// 正常
const STATUS_NORMAL = 0
// 已删除
const STATUS_DELETED = 1

// [TODO] redis 字段没有怎么恢复

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
     *
     * @param {number} userId
     * @param {Object} options
     */
    async findByUserId(userId, options) {
      options.where = {
        user_id: userId,
        status: STATUS_NORMAL,
      }
      return await this.findBy(options)
    }

    /**
     * 获取某个用户的关注数量
     *
     * @param {number} userId
     */
    async countByUserId(userId) {
      const key = `user_stat:${userId}`
      let count = await redis.hget(key, 'followee_count')
      if (count == null) {
        const list = await this.query(
          'SELECT COUNT(*) AS count FROM ?? WHERE user_id=? AND status=?',
          [this.tableName, userId, STATUS_NORMAL]
        )
        count = list[0].count
        await redis.hset(key, 'followee_count', count)
      }
      return +count
    }

    /**
     * 递增关注数
     *
     * @param {number} userId
     */
    async increaseCount(userId) {

      // 防止出现 redis 挂了，取不到值又从 0 开始了
      await this.countByUserId(userId)

      await redis.hincrby(`user_stat:${userId}`, 'followee_count', 1)

    }

    /**
     * 递减关注数
     *
     * @param {number} userId
     */
    async decreaseCount(userId) {

      // 防止出现 redis 挂了，取不到值又从 0 开始了
      await this.countByUserId(userId)

      await redis.hincrby(`user_stat:${userId}`, 'followee_count', -1)

    }

    /**
     * user id 是否已关注 followee id
     *
     * @param {number} userId
     * @param {number} followeeId
     * @return {boolean}
     */
    async hasFollow(userId, followeeId) {
      const result = await this.findOneBy({
        user_id: userId,
        followee_id: followeeId,
        status: STATUS_NORMAL,
      })
      return result ? true : false
    }

    /**
     * 关注用户
     *
     * @param {number} userId
     */
    async followUser(userId) {

      const { account, relation } = this.service

      // 确定用户存在
      await account.user.checkUserExistedById(userId)

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

      await this.increaseCount(currentUser.id)
      await relation.follower.increaseCount(userId)

      const now = Date.now()

    }

    /**
     * 取消关注用户
     *
     * @param {number} userId
     */
    async unfollowUser(userId) {

      const { account, relation } = this.service

      // 确定用户存在
      await account.user.checkUserExistedById(userId)

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

      await this.decreaseCount(currentUser.id)
      await relation.follower.decreaseCount(userId)

    }

  }
  return Followee
}
