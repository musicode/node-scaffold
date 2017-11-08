'use strict'

module.exports = app => {
  class User extends app.Service {

    async isLogin(userId) {
      userId = await app.redis.hget(`user:${userId}`, 'id')
      return userId ? true : false
    }

  }
  return User
}
