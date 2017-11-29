
'use strict'

module.exports = app => {

  const { code, redis, } = app

  class PostContent extends app.BaseService {

    get tableName() {
      return 'article_post_content'
    }

    get fields() {
      return [
        'post_id', 'content',
      ]
    }

    async getContentByPostId(postId) {
      const record = await this.findOneBy({
        post_id: postId,
      })
      return record ? record.content : ''
    }

  }
  return PostContent
}
