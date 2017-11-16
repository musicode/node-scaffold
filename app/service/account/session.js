'use strict'

module.exports = app => {
  class Session extends app.BaseService {

    async get(name) {
      let { accessToken } = this.ctx
      return await app.redis.hget(`session:${accessToken}`, name)
    }

    async set(name, value) {
      let { accessToken } = this.ctx
      await app.redis.hset(`session:${accessToken}`, name, value)
    }

    async remove(name) {
      let { accessToken } = this.ctx
      if (name) {
        await app.redis.hdel(`session:${accessToken}`, name)
      }
      else {
        await app.redis.del(`session:${accessToken}`)
      }
    }

  }
  return Session
}
