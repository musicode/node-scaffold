'use strict'

const code = require('./app/constant/code')
const util = require('./app/util')
const limit = require('./app/limit')
const moment = require('./app/moment')
const bootstrap = require('./app/bootstrap')
const validator = require('./app/validator')
const eventEmitter = require('./app/eventEmitter')
const BaseService = require('./app/service/base')

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
      const errors = validator.validate(rules, data)
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
     * 创建分页信息对象，返回列表型数据时需要用到这个方法
     *
     * @param {Object} input 输入参数
     * @param {numbebr} totalSize 数据总条数
     * @return {Object}
     */
    createPager(input, totalSize) {
      let { page, page_size } = input
      return {
        page: page,
        count: Math.ceil(totalSize / page_size),
        page_size: page_size,
        total_size: totalSize,
      }
    }

    /**
     * 抛出一个逻辑异常
     *
     * @param {number} code
     * @param {string} message
     */
    throw(code, message) {
      util.throw(code, message)
    }

  }

  app.BaseController = BaseController
  app.BaseService = BaseService

  app.code = code
  app.util = util
  app.limit = limit
  app.moment = moment
  app.eventEmitter = eventEmitter

  bootstrap(app)

}
