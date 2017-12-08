'use strict'

module.exports = app => {

  const { util, limit } = app

  class CommonController extends app.BaseController {

    async areaList() {

      const input = this.filter(this.input, {
        parent_id: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        parent_id: {
          required: false,
          type: 'number'
        },
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { common } = this.ctx.service

      const options = {
        page: input.page,
        page_size: input.page_size,
      }
      const list = await common.area.getListByParentId(input.parent_id, options)
      const count = await common.area.getCountByParentId(input.parent_id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }


  }

  return CommonController

}