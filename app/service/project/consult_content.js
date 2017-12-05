
'use strict'

module.exports = app => {

  class ConsultContent extends app.BaseService {

    get tableName() {
      return 'project_consult_content'
    }

    get fields() {
      return [
        'consult_id', 'content',
      ]
    }

  }
  return ConsultContent
}
