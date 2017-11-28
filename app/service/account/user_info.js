'use strict'

module.exports = app => {

  const { code, eventEmitter } = app

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

    async setUserInfo(data) {

      const { account } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const fields = this.getFields(data)
      if (fields) {
        if (fields.domain) {
          // 小写化
          fields.domain = fields.domain.toLowerCase()
        }
        const userId = currentUser.id
        const rows = await this.update(fields, { user_id: userId })
        if (rows === 1) {
          await this.updateRedis(`user:${userId}`, fields)
          eventEmitter.emit(
            eventEmitter.USER_UDPATE,
            {
              userId,
              fields,
            }
          )
          return true
        }
      }

      return false

    }

  }
  return UserInfo
}
