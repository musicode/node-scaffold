
'use strict'

module.exports = app => {

  class ReplyContent extends app.BaseService {

    get tableName() {
      return 'qa_reply_content'
    }

    get fields() {
      return [
        'reply_id', 'content',
      ]
    }

  }
  return ReplyContent
}
