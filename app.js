'use strict'

const Parameter = require('parameter')
const code = require('./app/constant/code')

module.exports = app => {

  class BaseController extends app.Controller {

    get input() {
      return this.ctx.input
    }

    get output() {
      return this.ctx.output
    }

    filter(data, filters) {
      return this.ctx.filter(data, filters)
    }

    validate(data, rules) {
      let errors = validator.validate(rules, data)
      if (errors) {
        errors.forEach(
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

  let validator = new Parameter()

  validator.addRule(
    'mobile',
    (rule, value) => {
      if (typeof value !== 'string' || !/1\d{10}/.test(value)) {
        return 'must be a mobile number'
      }
    }
  )

  validator.addRule(
    'verify_code',
    (rule, value) => {
      if (typeof value !== 'string' || !/\d{6}/.test(value)) {
        return 'must be a number'
      }
    }
  )

}
