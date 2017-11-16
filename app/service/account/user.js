'use strict'

const bcrypt = require('bcryptjs')
const salt = 10

const code = require('../../constant/code')

module.exports = app => {
  class User extends app.BaseService {

    get tableName() {
      return 'account_user'
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

      let userId = this.transaction(
        async () => {
          let password = await this.createHash(data.password)
          let number = this.ctx.helper.randomInt(11)
          let userId = await super.insert({
            mobile: data.mobile,
            number,
            password,
          })
          await this.service.account.userInfo.insert({
            userId,
            nickname: data.nickname,
            gender: data.gender,
            company: data.company,
            job: data.job
          })
          await this.service.account.register.insert({
            userId,
          })

          let user = {
            id: userId,
            number,
            password,
            nickname: data.nickname,
            gender: data.gender,
            mobile: data.mobile,
            company: data.company,
            job: data.job,
          }

          await this.setCache(userId, user)

          user.email = ''
          user.domain = ''
          user.avatar = ''
          user.followee_count = 0
          user.follower_count = 0
          user.view_count = 0

          return userId

        }
      )

      if (userId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '注册失败'
        )
      }

      return userId

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
