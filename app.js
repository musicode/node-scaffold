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
        err.errors.forEach(
          error => {
            this.output[ error.field ] = error.message
          }
        )
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
      let error = new Error()
      error.code = errorCode
      error.message = errorMessage
      throw error
    }

  }

  app.BaseController = BaseController

  app.validator.addRule(
    'mobile',
    (rule, value) => {
      if (typeof value !== 'string' || !/1\d{10}/.test(value)) {
        return 'must be a mobile number'
      }
    }
  )

}
