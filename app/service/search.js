
'use strict'

module.exports = app => {

  const { code, config } = app

  class Search extends app.BaseService {

    async upsert(type, entity, author) {

      const url = config.server.search + '/upsert'

      entity.type = type

      if (author) {
        entity.user_id = author.id
        entity.user_number = author.number
      }

      const response = await this.ctx.curl(
        config.server.search + '/upsert',
        {
          method: 'POST',
          contentType: 'json',
          dataType: 'json',
          data: entity,
        }
      )

      if (response.status_code !== 200) {
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

      if (response.status_code !== 200) {
        this.throw(
          code.INNER_ERROR,
          'REMOVE 索引错误'
        )
      }

    }

    async search(params, currentUserId) {

      const data = util.filterObject(
        params,
        [
          'page', 'page_size', 'sort_by', 'sort_order',
          'user_id', 'user_number', 'status', 'max_content_length'
        ]
      )

      data.type = params.types.join(',')
      data._and = 'and' in params ? params.and : 0
      data._user_id = currentUserId || ''

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

      if (response.status_code !== 200) {
        this.throw(
          code.INNER_ERROR,
          'SEARCH 索引错误'
        )
      }

      return {
        list: response.data.list,
        ts: 0,
      }

    }

    async news(params, currentUserId) {

      const data = util.filterObject(
        params,
        [
          'page', 'page_size', 'user_number', 'max_content_length', 'ts',
        ]
      )

      data._user_id = currentUserId || ''

      const response = await this.ctx.curl(
        config.server.search + '/news',
        {
          method: 'GET',
          contentType: 'json',
          dataType: 'json',
          data,
        }
      )

      if (response.status_code !== 200) {
        this.throw(
          code.INNER_ERROR,
          'NEWS 索引错误'
        )
      }

      return {
        list: response.data.list,
        ts: 0,
      }

    }

  }
  return Search
}