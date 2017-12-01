'use strict'

const Parameter = require('parameter')

const validator = new Parameter()
const util = require('./util')

validator.addRule(
  'mobile',
  (rule, value) => {
    if (typeof value !== 'string' || !/1\d{10}/.test(value)) {
      return '手机号码格式错误'
    }
  }
)

validator.addRule(
  'sort_by',
  (rule, value) => {
    if (value) {
      if (util.type(value) !== 'string') {
        return 'sort_by must be a string.'
      }
    }
  }
)

validator.addRule(
  'sort_order',
  (rule, value) => {
    if (value) {
      if (util.type(value) !== 'string') {
        return 'sort_order must be a string.'
      }
      value = value.toLowerCase()
      if (value !== 'asc' && value !== 'desc') {
        return 'sort_order must be "asc" or "desc".'
      }
    }
  }
)

module.exports = validator
