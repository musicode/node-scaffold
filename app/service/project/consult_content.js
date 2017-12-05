
'use strict'

module.exports = app => {

  class ConsultContent extends app.BaseService {

    get tableName() {
      return 'project_demand_content'
    }

    get fields() {
      return [
        'demand_id', 'content',
      ]
    }

  }
  return ConsultContent
}
