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

  }
  return ProfileAllowed
}