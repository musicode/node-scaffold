'use strict'

module.exports = app => {
  class UserInfo extends app.Service {

    async insert(data) {
      return app.mysql.insert(
        'account_user_info',
        {
          user_id: data.userId,
          nickname: data.nickname,
          gender: data.gender,
          company: data.company,
          job: data.job,
        }
      )
    }

  }
  return UserInfo
}
