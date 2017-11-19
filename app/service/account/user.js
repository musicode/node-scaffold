'use strict'

const bcrypt = require('bcryptjs')
const salt = 10

const code = require('../../constant/code')

module.exports = app => {
  class User extends app.BaseService {

    get tableName() {
      return 'account_user'
    }

    get fields() {
      return [
        'number', 'mobile', 'password', 'email', 'status'
      ]
    }

    async createHash(password) {
      return bcrypt.hash(password, salt)
    }

    async checkPassword(password, hash) {
      return bcrypt.compare(password, hash)
    }

    async signup(data) {

      let user = await this.findOneBy({
        mobile: data.mobile,
      })

      if (user) {
        this.throw(
          code.RESOURCE_EXISTS,
          '该手机号已注册'
        )
      }

      user = this.transaction(
        async () => {
          let password = await this.createHash(data.password)
          let number = this.ctx.helper.randomInt(6)

          data.number = data.password
          data.password = password

          let userId = await super.insert(data)

          data.user_id = userId
          let userInfoId = await this.service.account.userInfo.insert(data)

          let { request } = this.ctx
          await this.service.account.register.insert({
            user_id: userId,
            client_ip: request.ip,
            user_agent: request.get('user-agent'),
          })

          data.id = userId

          await this.setCache(userId, data)

          // 对外隐藏密码
          if (data.password) {
            data.password = true
          }

          data.followee_count = 0
          data.follower_count = 0
          data.view_count = 0

          return data

        }
      )

      if (!user) {
        this.throw(
          code.DB_INSERT_ERROR,
          '注册失败'
        )
      }

      return user

    }

    /**
     * 登录
     *
     * @param {Object} data
     * @property {string} data.mobile
     * @property {string} data.password
     */
    async signin(data) {

      let user = await this.findOneBy({
        mobile: data.mobile,
      })

      if (!user) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '该手机号未注册'
        )
      }

      let matched = await this.checkPassword(data.password, user.password)
      if (!matched) {
        this.throw(
          code.AUTH_ERROR,
          '手机号或密码错误'
        )
      }

      return user

    }

    /**
     * 退出登录
     */
    async signout() {
      let { session } = this.service
      let { currentUser } = this.config.session

      let userId = await session.get(currentUser)
      if (!userId) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '未登录，无法退出登录'
        )
      }

      session.remove(currentUser)

    }

    async setCache(userId, data) {
      for (let key in data) {
        let value = data[key]
        if (value != null) {
          await app.redis.hset(`user:${userId}`, key, value)
        }
      }
    }

    async getCache(userId, name) {
      if (name) {
        return await app.redis.hget(`user:${userId}`, name)
      }
      return await app.redis.hgetall(`user:${userId}`)
    }

  }
  return User
}
