'use strict'

const code = require('./app/constant/code')
const helper = require('./app/extend/helper')
const limit = require('./app/limit')
const moment = require('./app/moment')
const validator = require('./app/validator')
const eventEmitter = require('./app/eventEmitter')

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

      return app.mysql.select(this.tableName, data)

    }

    async insert(data) {

      let params = { }

      this.fields.forEach(
        field => {
          if (field in data) {
            params[field] = data[field]
          }
        }
      )

      if (Object.keys(params).length) {
        const result = await app.mysql.insert(
          this.tableName,
          params
        )
        if (result.affectedRows === 1) {
          return result.insertId
        }
      }

    }

    async update(data, where) {
      Object.assign(data, where)
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
      return await app.mysql.beginTransactionScope(
        handler,
        this.ctx
      )
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

  app.code = code
  app.helper = helper
  app.limit = limit
  app.moment = moment
  app.eventEmitter = eventEmitter

}
