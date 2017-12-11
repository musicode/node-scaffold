'use strict'

const CURRENT_USER = Symbol('Context#currentUser')

module.exports = app => {

  const { code, redis, config } = app

  class Session extends app.BaseService {

    get accessToken() {
      return this.ctx.accessToken
    }

    async get(name) {
      return await redis.hget(`session:${this.accessToken}`, name)
    }

    async set(name, value) {
      await redis.hset(`session:${this.accessToken}`, name, value)
    }

    async remove(name) {
      if (name) {
        await redis.hdel(`session:${this.accessToken}`, name)
      }
      else {
        await redis.del(`session:${this.accessToken}`)
      }
    }

    async getExpire(name) {
      return await redis.get(`expire_session:${this.accessToken}:${name}`)
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
      await redis.set(key, value)
      await redis.expire(key, expireTime / 1000)
    }

    async setVerifyCode(mobile, verifyCode) {
      await this.setExpire(
        config.session.verifyCode,
        `${mobile}:${verifyCode}`,
        config.expireTime.verifyCode
      )
    }

    async checkVerifyCode(mobile, verifyCode) {
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
            '未发送该验证码或验证码已过期'
          )
        }
        if (value != `${mobile}:${verifyCode}`) {
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
      let userId = await this.get(
        config.session.currentUser
      )
      if (userId) {
        return await this.service.account.user.getUserById(userId)
      }
    }

  }
  return Session
}
