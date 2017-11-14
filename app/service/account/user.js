'use strict'

const bcrypt = require('bcryptjs')

module.exports = app => {
  class User extends app.Service {

    async createHash(password) {
      return bcrypt.hash(password)
    }

    async checkPassword(password, hash) {
      return bcrypt.compare(password, hash)
    }

  }
  return User
}
