
'use strict'

module.exports = app => {

  class PostContent extends app.BaseService {

    get tableName() {
      return 'article_post_content'
    }

    get fields() {
      return [
        'post_id', 'content',
      ]
    }

  }
  return PostContent
}
