
'use strict'

module.exports = app => {

  class CommentContent extends app.BaseService {

    get tableName() {
      return 'article_comment_content'
    }

    get fields() {
      return [
        'comment_id', 'content',
      ]
    }

  }
  return CommentContent
}
