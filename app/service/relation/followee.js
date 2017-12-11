
'use strict'

// 正常
const STATUS_NORMAL = 0
// 已删除
const STATUS_DELETED = 1

module.exports = app => {

  const { code } = app

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
     * 获取某个用户的关注数量
     *
     * @param {number} userId
     * @param {Object} options
     */
    async getFolloweeCount(userId) {
      const { account } = this.service
      return await account.user.getUserFolloweeCount(userId)
    }

    /**
     * 获取某个用户的关注列表
     *
     * @param {number} userId
     * @param {Object} options
     */
    async getFolloweeList(userId, options) {
      options.where = {
        user_id: userId,
        status: STATUS_NORMAL,
      }
      return await this.findBy(options)
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

      const { account, relation, trace } = this.service

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

          await trace.follow.followUser(userId)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_ERROR,
          '关注失败'
        )
      }

      await account.user.increaseUserFolloweeCount(currentUser.id)
      await account.user.increaseUserFollowerCount(userId)

    }

    /**
     * 取消关注用户
     *
     * @param {number} userId
     */
    async unfollowUser(userId) {

      const { account, relation, trace } = this.service

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
          await trace.follow.unfollowUser(userId)
          return true
        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_ERROR,
          '取消关注失败'
        )
      }

      await account.user.decreaseUserFolloweeCount(currentUser.id)
      await account.user.decreaseUserFollowerCount(userId)

    }

  }
  return Followee
}
