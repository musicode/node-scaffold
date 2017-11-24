'use strict'

const CURRENT_USER = Symbol('Context#currentUser')

module.exports = app => {

  const { code, config } = app

  class Session extends app.BaseService {

    get accessToken() {
      return this.ctx.accessToken
    }

    async get(name) {
      return await app.redis.hget(`session:${this.accessToken}`, name)
    }

    async set(name, value) {
      await app.redis.hset(`session:${this.accessToken}`, name, value)
    }

    async remove(name) {
      if (name) {
        await app.redis.hdel(`session:${this.accessToken}`, name)
      }
      else {
        await app.redis.del(`session:${this.accessToken}`)
      }
    }

    async getExpire(name) {
      return await app.redis.get(`expire_session:${this.accessToken}:${name}`)
    }

    /**
     *
     * @param {string} name
     * @param {string|number} value
     * @param {number} expireTime 过期时间，单位毫秒
     */
    async setExpire(name, value, expireTime) {
      if (!expireTime) {
        this.throw(
          code.INNER_ERROR,
          'setExpire 缺少 expireTime 参数'
        )
      }
      const key = `expire_session:${this.accessToken}:${name}`
      await app.redis.set(key, value)
      await app.redis.expire(key, expireTime / 1000)
    }

    async checkVerifyCode(verifyCode) {
      const { PARAM_INVALID } = code
      if (!verifyCode) {
        this.throw(
          PARAM_INVALID,
          '缺少验证码'
        )
      }
      if (!config.system.ignoreVerifyCode) {
        const value = await this.getExpire(
          config.session.verifyCode
        )
        if (!value) {
          this.throw(
            PARAM_INVALID,
            '未发送该验证码'
          )
        }
        if (value != verifyCode) {
          this.throw(
            PARAM_INVALID,
            '验证码错误'
          )
        }
      }
    }

    async checkCurrentUser() {
      const currentUser = await this.getCurrentUser()
      if (!currentUser) {
        this.throw(
          code.AUTH_UNSIGNIN,
          '未登录，无法操作'
        )
      }
      return currentUser
    }

    async getCurrentUser() {
      if (this[CURRENT_USER] == null) {
        let userId = await this.get(
          config.session.currentUser
        )
        if (userId) {
          this[CURRENT_USER] = await this.service.account.user.getUserById(userId)
        }
        else {
          this[CURRENT_USER] = false
        }
      }
      return this[CURRENT_USER]
    }

  }
  return Session
}
