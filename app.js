'use strict'

module.exports = app => {
  class BaseController extends app.Controller {

    validate(rules) {
      try {
        this.ctx.validate(rules, this.ctx.input)
      }
      catch (err) {
        throw err
      }
    }

    success(msg = 'success') {
      this.ctx.body = {
        code: 0,
        data: this.ctx.output,
        msg,
      }
    }

    list(list, totalSize) {
      let { input } = this.ctx
      this.success({
        list,
        pager: {
          page: input.page,
          count: Math.ceil(totalSize / pageSize),
          page_size: input.page_size,
          total_size,
        }
      })
    }

  }
  app.BaseController = BaseController

}
