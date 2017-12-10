
'use strict'

module.exports = app => {

  const { code, util, config } = app

  class Search extends app.BaseService {

    async upsert(type, entity) {

      const url = config.server.search + '/upsert'

      entity.type = type

      const { account } = this.service
      const currentUser = await account.session.getCurrentUser()

      if (currentUser) {
        entity.user_id = currentUser.id
        entity.user_number = currentUser.number
      }

      entity.create_time = util.formatDateTime(entity.create_time, true)
      entity.update_time = util.formatDateTime(entity.update_time, true)

      // [TODO] 这里用 GET 有隐患
      const response = await this.ctx.curl(
        config.server.search + '/upsert',
        {
          method: 'GET',
          contentType: 'json',
          dataType: 'json',
          data: entity,
        }
      )
      console.log(config.server.search, response, entity)
      if (response.status !== 200) {
        this.throw(
          code.INNER_ERROR,
          'UPSERT 索引错误'
        )
      }

    }

    async remove(type, id) {

      const response = await this.ctx.curl(
        config.server.search + '/remove',
        {
          method: 'GET',
          contentType: 'json',
          dataType: 'json',
          data: {
            type,
            id,
          }
        }
      )
      console.log(response)
      if (response.status !== 200) {
        this.throw(
          code.INNER_ERROR,
          'REMOVE 索引错误'
        )
      }

    }

    async search(params) {

      const data = util.filterObject(
        params,
        [
          'page', 'page_size', 'sort_by', 'sort_order',
          'user_id', 'user_number', 'status', 'max_content_length'
        ]
      )

      data.type = params.types.join(',')
      data._and = 'and' in params ? params.and : 0

      const { account } = this.service
      const currentUser = await account.session.getCurrentUser()
      data._user_id = currentUser ? currentUser.id : ''

      // 搜索字段
      const fields = params.fields
      const query = params.query

      if (util.type(query) === 'string' && util.type(fields) === 'array') {
        fields.forEach(
          field => {
            data[ field ] = query
          }
        )
      }

      const response = await this.ctx.curl(
        config.server.search + '/search',
        {
          method: 'GET',
          contentType: 'json',
          dataType: 'json',
          data,
        }
      )

      // status/headers/res/data
      if (response.status !== 200) {
        this.throw(
          code.INNER_ERROR,
          'SEARCH 索引错误'
        )
      }

      return response.data

    }

    async news(params) {

      const data = util.filterObject(
        params,
        [
          'page', 'page_size', 'user_number', 'max_content_length', 'ts',
        ]
      )

      const { account } = this.service
      const currentUser = await account.session.getCurrentUser()
      data._user_id = currentUser ? currentUser.id : ''

      const response = await this.ctx.curl(
        config.server.search + '/news',
        {
          method: 'GET',
          contentType: 'json',
          dataType: 'json',
          data,
        }
      )
console.log(response)
      if (response.status !== 200) {
        this.throw(
          code.INNER_ERROR,
          'NEWS 索引错误'
        )
      }

      return response.data

    }

  }
  return Search
}