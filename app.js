'use strict'

module.exports = app => {
  class BaseController extends app.Controller {

    get currentUser() {

    }

    validate(rules) {
      let data
      if (this.ctx.method === 'POST') {
        data = this.ctx.request.body
      }
      else {
        data = this.ctx.request.query
      }
      this.ctx.validate(rules, data)
    }

    success(data = { }, msg = 'success') {
      this.ctx.body = {
        code: 0,
        data,
        msg,
      }
    }

    list(list, page, pageSize, totalSize) {
      this.success({
        list,
        pager: {
          page,
          count: Math.ceil(totalSize / pageSize),
          page_size,
          total_size,
        }
      })
    }

  }
  app.BaseController = BaseController
}
