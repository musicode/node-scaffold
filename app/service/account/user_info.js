'use strict'

module.exports = app => {

  const { code } = app

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

    format(userInfo) {
      if (userInfo.birthday === '0000-00-00') {
        userInfo.birthday = ''
      }
    }

    async getUserInfoByUserId(userId) {

      const userInfo = await this.findOneBy({
        user_id: userId,
      })

      this.format(userInfo)

      return userInfo

    }

    async setUserInfoByUserId(data, userId) {

      const { account } = this.ctx.service

      const user = await account.checkUserExisted(userId)
      const currentUser = await account.session.checkCurrentUser()

      if (user.id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '不能修改别人的资料'
        )
      }

      const rows = await this.update(data, { user_id: userId })
      if (rows === 1) {
        await this.updateRedis(`user:${userId}`, data)
        return true
      }

      return false

    }

  }
  return UserInfo
}
