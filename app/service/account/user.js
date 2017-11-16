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
          let userId = await super.insert({
            number: this.ctx.helper.randomInt(11),
            mobile: data.mobile,
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

  }
  return User
}
