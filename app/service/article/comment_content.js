
'use strict'

module.exports = app => {

  class ContentContent extends app.BaseService {

    get tableName() {
      return 'article_comment_content'
    }

    get fields() {
      return [
        'comment_id', 'content',
      ]
    }

  }
  return ContentContent
}
