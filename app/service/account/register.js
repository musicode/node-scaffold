'use strict'

module.exports = app => {
  class Register extends app.BaseService {

    get tableName() {
      return 'account_register'
    }

    async insert(data) {
      let { request } = this.ctx
      return super.insert(
        {
          user_id: data.userId,
          client_ip: request.ip,
          user_agent: request.get('user-agent'),
        }
      )
    }

  }
  return Register
}
