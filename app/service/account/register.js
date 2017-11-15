'use strict'

module.exports = app => {
  class Register extends app.Service {

    async insert(data) {
      return app.mysql.insert(
        'account_register',
        {
          user_id: data.userId,
          client_ip: data.clientIp,
          user_agent: data.userAgent,
        }
      )
    }

  }
  return Register
}
