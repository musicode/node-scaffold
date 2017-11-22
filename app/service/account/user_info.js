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

    async getUserInfoByUserId(userId) {

      const userInfo = await this.findOneBy({
        user_id: userId,
      })

      if (userInfo.birthday === '0000-00-00') {
        userInfo.birthday = ''
      }

      return userInfo

    }

  }
  return UserInfo
}
