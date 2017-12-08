
'use strict'

// 国家
const TYPE_COUNTRY = 0
// 省
const TYPE_PROVINCE = 1
// 市
const TYPE_CITY = 2
// 区
const TYPE_DISTRICT = 3

module.exports = app => {

  const { code, util, config } = app

  class Area extends app.BaseService {

    get tableName() {
      return 'common_area'
    }

    get fields() {
      return [
        'name', 'type', 'parent_id',
      ]
    }

    async getAreaById(areaId) {

      const result = { }

      const record = await this.findOneBy({ id: areaId })

      const node = {
        id: record.id,
        name: record.name,
      }

      switch (record.type) {
        case TYPE_COUNTRY:
          result.country = node
          break

        case TYPE_PROVINCE:
          result.province = node
          break

        case TYPE_CITY:
          result.city = node
          break

        case TYPE_DISTRICT:
          result.district = node
          break
      }

      if (record.parent_id == 0) {
        return result
      }

      const parent = await this.getAreaById(record.parent_id)
      Object.assign(result, parent)

      return result

    }

    async getListByParentId(parentId, options) {

      options.where = {
        parent_id: parentId && parentId != 0 ? parentId : 0,
      }

      options.columns = [ 'id', 'name', 'type' ]

      return await this.findBy(options)

    }

    async getCountByParentId(parentId) {

      return await this.countBy({
        parent_id: parentId && parentId != 0 ? parentId : 0,
      })

    }



  }
  return Area
}