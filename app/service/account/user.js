'use strict'

const bcrypt = require('bcryptjs')
const salt = 10

module.exports = app => {
  class User extends app.Service {

    async createHash(password) {
      return bcrypt.hash(password, salt)
    }

    async checkPassword(password, hash) {
      return bcrypt.compare(password, hash)
    }

    async findOneByMobile(mobile) {
      return app.mysql.get('account_user', { mobile })
    }

    async insert(data) {
      let password = await this.createHash(data.password)
      return app.mysql.insert(
        'account_user',
        {
          number: data.number,
          mobile: data.mobile,
          password,
        }
      )
    }

  }
  return User
}
