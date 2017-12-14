'use strict'

module.exports = app => {

  const { util } = app

  class TestController extends app.BaseController {

    async test() {
      const data = { name: 'egg11123123123123' }
      await this.ctx.render('index.html', data)
    }

  }

  return TestController

}