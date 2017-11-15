'use strict'

module.exports = app => {
  class UserInfo extends app.BaseService {

    get tableName() {
      return 'account_user_info'
    }

    async insert(data) {
      return super.insert(
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
