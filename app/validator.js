'use strict'

const Validator = require('x-validator')

const validator = new Validator(
  (key, value, errorReason, rule) => {
    switch (errorReason) {
      case 'required':
        return '缺少' + key

      case 'type':
        return type + '类型错误'

      case 'empty':
        return key + '不能为空字符串'

      case 'pattern':
        return key + '格式错误'

      case 'min':
        if (typeof value === 'number') {
          return key + '不能小余' + rule.min
        }
        else {
          return key + '长度不能小余' + rule.min
        }

      case 'max':
        if (typeof value === 'number') {
          return key + '不能小余' + rule.min
        }
        else {
          return key + '长度不能小余' + rule.min
        }

      case 'itemType':
        return key + '数组类型错误'
    }
  }
)
const util = require('./util')
const limit = require('./limit')

validator.add(
  'mobile',
  (rule, value) => {
    if (util.type(value) !== 'string' || !/1\d{10}/.test(value)) {
      return '手机号码格式错误'
    }
  }
)

validator.add(
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

validator.add(
  'verify_code',
  (rule, value) => {
    if (util.type(value) !== 'string' || !/\d{6}/.test(value)) {
      return '验证码格式错误'
    }
  }
)

validator.add(
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

validator.add(
  'page',
  (rule, value) => {
    if (value != null) {
      if (util.type(value) !== 'number' || value <= 0) {
        return 'must be a positive number'
      }
    }
  }
)

validator.add(
  'page_size',
  (rule, value) => {
    if (value != null) {
      if (util.type(value) !== 'number' || value <= 0) {
        return 'must be a positive number'
      }
    }
  }
)

validator.add(
  'sort_by',
  (rule, value) => {
    if (value) {
      if (util.type(value) !== 'string') {
        return 'must be a string.'
      }
    }
  }
)

validator.add(
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
