'use strict'

const Parameter = require('parameter')
const code = require('./app/constant/code')

module.exports = app => {

  function throwError(code, message) {
    const error = new Error()
    error.code = code
    error.message = message
    throw error
  }

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
     * 抛出一个逻辑异常
     *
     * @param {number} code
     * @param {string} message
     */
    throw(code, message) {
      throwError(code, message)
    }

  }

  class BaseService extends app.Service {

    async findOneBy(where) {
      return app.mysql.get(this.tableName, where)
    }

    async findBy(options) {

      const data = { where: options.where }

      if (options.page && options.pageSize) {
        data.offset = (options.page - 1) * options.pageSize
        data.limit = options.pageSize
      }

      if (options.sortBy && options.sortOrder) {
        data.orders = [[options.sortOrder,  options.sortBy]]
      }

      return app.mysql.get(this.tableName, data)

    }

    async insert(data) {
      const result = await app.mysql.insert(
        this.tableName,
        data
      )
      if (result.affectedRows === 1) {
        return result.insertId
      }
    }

    async update(data) {
      const result = await app.mysql.update(
        this.tableName,
        data
      )
      return result.affectedRows
    }

    async delete(where) {
      const result = await app.mysql.delete(
        this.tableName,
        where
      )
      return result.affectedRows
    }

    async transaction(handler) {
      const result = await app.mysql.beginTransactionScope(
        handler,
        this.ctx
      )
      return result
    }

    /**
     * 抛出一个逻辑异常
     *
     * @param {number} code
     * @param {string} message
     */
    throw(code, message) {
      throwError(code, message)
    }

  }

  app.BaseController = BaseController
  app.BaseService = BaseService

  let validator = new Parameter()

  validator.addRule(
    'mobile',
    (rule, value) => {
      if (typeof value !== 'string' || !/1\d{10}/.test(value)) {
        return '手机号码格式错误'
      }
    }
  )

  validator.addRule(
    'password',
    (rule, value) => {
      if (typeof value !== 'string' || value === '') {
        return '不能为空'
      }
      if (value.length < 5) {
        return '长度不能小于 5'
      }
      if (value.length > 20) {
        return '长度不能大于 20'
      }
    }
  )

  validator.addRule(
    'verify_code',
    (rule, value) => {
      if (typeof value !== 'string' || !/\d{6}/.test(value)) {
        return '必须是 6 位数字'
      }
    }
  )

}
