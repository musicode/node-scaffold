'use strict'

const bcrypt = require('bcryptjs')
const salt = 10

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

    async insert(data) {
      let password = await this.createHash(data.password)
      return super.insert({
        number: this.ctx.helper.randomInt(11),
        mobile: data.mobile,
        password,
      })
    }

  }
  return User
}
