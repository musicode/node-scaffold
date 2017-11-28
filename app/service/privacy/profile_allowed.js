/**
 * 允许谁看我的资料
 */

'use strict'

const ALL_ALLOWED = 0
const FOLLOWER_ALLOWED = 1
const FRIEND_ALLOWED = 2

module.exports = app => {

  const { code } = app

  class ProfileAllowed extends app.BaseService {

    get tableName() {
      return 'privacy_profile_allowed'
    }

    get fields() {
      return [
        'user_id', 'allowed_type',
      ]
    }

    get ALL_ALLOWED() {
      return ALL_ALLOWED
    }

    get FOLLOWER_ALLOWED() {
      return FOLLOWER_ALLOWED
    }

    get FRIEND_ALLOWED() {
      return FRIEND_ALLOWED
    }

    /**
     * 设置不让谁看我的动态
     *
     * @param {number} allowedType
     */
    async setAllowedType(allowedType) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      if (allowedType !== ALL_ALLOWED
        && allowedType !== FOLLOWER_ALLOWED
        && allowedType !== FRIEND_ALLOWED
      ) {
        this.throw(
          code.PARAM_INVALID,
          'allowedType 未匹配枚举值'
        )
      }

      const record = await this.findOneBy({ user_id: currentUser.id })
      if (record) {
        if (record.allowed_type !== allowedType) {
          await this.update(
            {
              allowed_type: allowedType,
            },
            {
              id: record.id,
            }
          )
        }
      }
      else {
        await this.insert({
          user_id: currentUser.id,
          allowed_type: allowedType,
        })
      }

    }

    /**
     * 获取用户资料的访问权限
     *
     * @param {number} userId
     * @return {number}
     */
    async getAllowedTypeByUserId(userId) {
      const result = await this.findOneBy({
        user_id: userId,
      })
      return result ? result.allowed_type : ALL_ALLOWED
    }

    /**
     * user 是否能访问 target
     *
     * @param {number?} userId
     * @param {number} targetId
     */
    async checkAllowedType(userId, targetId) {

      const { relation } = this.service

      const allowedType = await this.getAllowedTypeByUserId(targetId)
      if (allowedType === ALL_ALLOWED) {
        return
      }

      // 不是所有人能看，那 userId 必须有值
      if (!userId) {
        this.throw(
          code.PERMISSION_DENIED,
          '只有登录用户才能查看信息'
        )
      }

      const isFollowee = await relation.followee.hasFollow(userId, targetId)
      if (allowedType === FOLLOWER_ALLOWED) {
        if (!isFollowee) {
          this.throw(
            code.PERMISSION_DENIED,
            '对方设置关注后才能查看信息'
          )
        }
      }
      else if (allowedType === FRIEND_ALLOWED) {
        const isFollower = await relation.followee.hasFollow(targetId, userId)
        if (!isFollowee || !isFollower) {
          this.throw(
            code.PERMISSION_DENIED,
            '对方设置仅好友可见'
          )
        }
      }
    }

  }
  return ProfileAllowed
}