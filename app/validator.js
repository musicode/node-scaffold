'use strict'

const Parameter = require('parameter')

const validator = new Parameter()

validator.addRule(
  'mobile',
  (rule, value) => {
    if (typeof value !== 'string' || !/1\d{10}/.test(value)) {
      return '手机号码格式错误'
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

module.exports = validator
