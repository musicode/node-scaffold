
'use strict'

module.exports = app => {

  class DemandContent extends app.BaseService {

    get tableName() {
      return 'project_demand_content'
    }

    get fields() {
      return [
        'demand_id', 'content',
      ]
    }

  }
  return DemandContent
}
