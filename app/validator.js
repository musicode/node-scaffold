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

module.exports = validator
