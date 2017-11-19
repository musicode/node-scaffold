'use strict'

module.exports = app => {
  class Register extends app.BaseService {

    get tableName() {
      return 'account_register'
    }

    get fields() {
      return [
        'user_id', 'user_agent', 'client_ip'
      ]
    }

  }
  return Register
}
