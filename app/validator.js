'use strict'

const Parameter = require('parameter')

const validator = new Parameter()
const util = require('./util')
const limit = require('./limit')

validator.addRule(
  'mobile',
  (rule, value) => {
    if (util.type(value) !== 'string' || !/1\d{10}/.test(value)) {
      return '手机号码格式错误'
    }
  }
)

validator.addRule(
  'domain',
  (rule, value) => {
    if (util.type(value) !== 'string') {
      return '参数错误'
    }
    if (!/^[a-z0-9_]+$/i.test(value)) {
      return '只能包含字母、数字、下划线'
    }
  }
)

validator.addRule(
  'verify_code',
  (rule, value) => {
    if (util.type(value) !== 'string' || !/\d{6}/.test(value)) {
      return '验证码格式错误'
    }
  }
)

validator.addRule(
  'end_date',
  (rule, value) => {
    if (!value || util.type('value') !== 'string') {
      return '缺少结束日期'
    }
    if (value != limit.SOFAR && !/\d{4}-\d{2}-\d{2}/.test(value)) {
      return '结束日期格式错误'
    }
  }
)

validator.addRule(
  'page',
  (rule, value) => {
    if (value != null) {
      if (util.type(value) !== 'number' || value <= 0) {
        return 'must be a positive number'
      }
    }
  }
)

validator.addRule(
  'page_size',
  (rule, value) => {
    if (value != null) {
      if (util.type(value) !== 'number' || value <= 0) {
        return 'must be a positive number'
      }
    }
  }
)

validator.addRule(
  'sort_by',
  (rule, value) => {
    if (value) {
      if (util.type(value) !== 'string') {
        return 'must be a string.'
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
        return 'must be "asc" or "desc".'
      }
    }
  }
)

module.exports = validator
