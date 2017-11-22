'use strict'

module.exports = app => {
  class Login extends app.BaseService {

    get tableName() {
      return 'account_login'
    }

    get fields() {
      return [
        'user_id', 'user_agent', 'client_ip'
      ]
    }

  }
  return Login
}
