'use strict'

module.exports = app => {
  class InviteCodeUsed extends app.BaseService {

    get tableName() {
      return 'account_invite_code_used'
    }

    get fields() {
      return [
        'user_id', 'invite_code_id',
      ]
    }

  }
  return InviteCodeUsed
}
