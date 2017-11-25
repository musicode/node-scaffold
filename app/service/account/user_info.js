'use strict'

module.exports = app => {
  class UserInfo extends app.BaseService {

    get tableName() {
      return 'account_user_info'
    }

    get fields() {
      return [
        'user_id', 'nickname', 'avatar',
        'gender', 'intro', 'birthday',
        'area_id', 'company', 'job',
        'domain', 'level'
      ]
    }

    formatUserInfo(userInfo) {
      if (userInfo.birthday === '0000-00-00') {
        userInfo.birthday = ''
      }
    }

    async getUserInfoByUserId(userId) {

      const userInfo = await this.findOneBy({
        user_id: userId,
      })

      this.formatUserInfo(userInfo)

      return userInfo

    }

    async setUserInfoByUserId(data, userId) {
      return await this.update(data, { user_id: userId })
    }

  }
  return UserInfo
}
