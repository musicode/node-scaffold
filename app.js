'use strict'

const code = require('./app/constant/code')

module.exports = app => {

  class BaseController extends app.Controller {

    get input() {
      return this.ctx.input
    }

    get output() {
      return this.ctx.output
    }

    /**
     * 验证输入参数
     *
     * @param {Object} rules
     */
    validate(rules) {
      try {
        this.ctx.validate(rules, this.ctx.input)
      }
      catch (err) {
        this.throw(
          code.PARAM_INVALID,
          'param invalid'
        )
      }
    }

    /**
     * 抛出一个逻辑异常
     *
     * @param {number} code
     * @param {string} message
     */
    throw(errorCode, errorMessage) {
      this.ctx.throw(200, 'Ok', {
        errorCode,
        errorMessage
      })
    }

  }

  app.BaseController = BaseController

}
