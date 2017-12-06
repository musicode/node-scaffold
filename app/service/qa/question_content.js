
'use strict'

module.exports = app => {

  class QuestionContent extends app.BaseService {

    get tableName() {
      return 'qa_question_content'
    }

    get fields() {
      return [
        'question_id', 'content',
      ]
    }

  }
  return QuestionContent
}
