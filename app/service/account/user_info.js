'use strict'

const cache = { }

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

      if (cache[ userId ]) {
        return cache[ userId ]
      }

      const userInfo = await this.findOneBy({
        user_id: userId,
      })

      this.format(userInfo)

      return cache[ userId ] = userInfo

    }

    async setUserInfo(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()
      const userId = currentUser.id

      if (cache[ userId ]) {
        delete cache[ userId ]
      }

      const fields = this.getFields(data)
      if (fields) {
        if (fields.domain) {
          // 小写化
          fields.domain = fields.domain.toLowerCase()
        }

        const rows = await this.update(fields, { user_id: userId })
        if (rows === 1) {
          await this.updateRedis(`user:${userId}`, fields)
          eventEmitter.emit(
            eventEmitter.USER_UPDATE,
            {
              userId,
              service: this.service,
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
