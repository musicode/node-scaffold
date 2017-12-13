'use strict'

const {
  Validator,
  checkString,
  checkInteger,
  checkEnum,
  checkDate,
} = require('x-validator')

// http://www.regular-expressions.info/email.html
const PATTERN_EMAIL = /^[a-z0-9\!\#\$\%\&\'\*\+\/\=\?\^\_\`\{\|\}\~\-]+(?:\.[a-z0-9\!\#\$\%\&\'\*\+\/\=\?\^\_\`\{\|\}\~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?$/

// https://gist.github.com/dperini/729294
const PATTERN_URL = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/i

const validator = new Validator()

const util = require('./util')
const limit = require('./limit')

validator.add(
  {
    url(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        pattern: PATTERN_URL,
      }

      return checkString(rule, value)

    },
    email(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        pattern: PATTERN_EMAIL,
      }

      return checkString(rule, value)

    },
    password(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        min: limit.USER_PASSWORD_MIN_LENGTH,
        max: limit.USER_PASSWORD_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    mobile(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        pattern: /^1\d{10}$/,
      }

      return checkString(rule, value)

    },
    nickname(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        min: limit.USER_NICKNAME_MIN_LENGTH,
        max: limit.USER_NICKNAME_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    gender(rule, value) {

      rule = {
        required: rule.required,
        type: 'enum',
        values: [
          limit.USER_GENDER_MALE,
          limit.USER_GENDER_FEMALE,
        ],
      }

      return checkEnum(rule, value)

    },
    domain(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        pattern: /^[a-z0-9_]+$/i,
      }

      return checkString(rule, value)

    },
    verify_code(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        pattern: /\d{6}/,
      }

      return checkString(rule, value)

    },
    invite_code(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
      }

      return checkString(rule, value)

    },
    career_company(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        max: limit.CAREER_COMPANY_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    career_job(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        max: limit.CAREER_JOB_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    career_description(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        max: limit.CAREER_DESCRIPTION_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    education_college(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        max: limit.EDUCATION_COLLEGE_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    education_speciality(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        max: limit.EDUCATION_SPECIALITY_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    education_degree(rule, value) {

      rule = {
        required: rule.required,
        type: 'enum',
        values: limit.EDUCATION_DEGREE_VALUES,
      }

      return checkString(rule, value)

    },
    education_description(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        max: limit.EDUCATION_DESCRIPTION_MAX_LENGTH,
      }

      return checkString(rule, value)

    },

    page(rule, value) {

      rule = {
        required: rule.required,
        type: 'int',
        min: 1,
      }

      return checkInteger(rule, value)

    },
    page_size(rule, value) {

      rule = {
        required: rule.required,
        type: 'int',
        min: 1,
      }

      return checkInteger(rule, value)

    },
    sort_by(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
      }

      return checkString(rule, value)

    },
    sort_order(rule, value) {

      rule = {
        required: rule.required,
        type: 'enum',
        values: [ 'asc', 'desc' ],
      }

      return checkEnum(rule, value)

    },
    start_date(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'date',
      }

      return checkDate(rule, value)

    },
    end_date(rule, value) {

      if (!value || util.type('value') !== 'string') {
        return 'required'
      }
      if (value != limit.SOFAR && !/\d{4}-\d{2}-\d{2}/.test(value)) {
        return 'pattern'
      }

    },
    anonymous(rule, value) {

      rule = {
        required: rule.required,
        type: 'enum',
        values: [
          limit.ANONYMOUS_YES,
          limit.ANONYMOUS_NO,
        ],
      }

      return checkEnum(rule, value)

    },
    comment_content(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        max: limit.COMMENT_CONTENT_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    post_title(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        min: limit.POST_TITLE_MIN_LENGTH,
        max: limit.POST_TITLE_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    post_content(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        min: limit.POST_CONTENT_MIN_LENGTH,
        max: limit.POST_CONTENT_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    consult_content(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        max: limit.CONSULT_CONTENT_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    demand_title(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        min: limit.DEMAND_TITLE_MIN_LENGTH,
        max: limit.DEMAND_TITLE_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    demand_content(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        min: limit.DEMAND_CONTENT_MIN_LENGTH,
        max: limit.DEMAND_CONTENT_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    reply_content(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        max: limit.REPLY_CONTENT_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    question_title(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        min: limit.QUESTION_TITLE_MIN_LENGTH,
        max: limit.QUESTION_TITLE_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    question_content(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        min: limit.QUESTION_CONTENT_MIN_LENGTH,
        max: limit.QUESTION_CONTENT_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
    issue_content(rule, value) {

      rule = {
        required: rule.required,
        empty: rule.empty,
        type: 'string',
        min: limit.ISSUE_CONTENT_MIN_LENGTH,
        max: limit.ISSUE_CONTENT_MAX_LENGTH,
      }

      return checkString(rule, value)

    },
  },
  {
    url: {
      required: '请输入网址',
      type: '请输入网址',
      empty: '请输入网址',
      pattern: '网址格式错误',
    },
    email: {
      required: '请输入邮箱',
      type: '请输入邮箱',
      empty: '请输入邮箱',
      pattern: '请输入正确的邮箱',
    },
    password: {
      required: '请输入密码',
      type: '请输入密码',
      empty: '请输入密码',
      min: '密码最少需要' + limit.USER_PASSWORD_MIN_LENGTH + '位',
      max: '密码最多不能超过' + limit.USER_PASSWORD_MAX_LENGTH + '位',
    },
    mobile: {
      required: '请输入手机号',
      type: '请输入手机号',
      empty: '请输入手机号',
      pattern: '手机号码格式错误',
    },
    nickname: {
      required: '请输入昵称',
      type: '请输入昵称',
      empty: '请输入昵称',
      min: '昵称请不要少于' + limit.USER_NICKNAME_MIN_LENGTH + '个字',
      max: '昵称请不要超过' + limit.USER_NICKNAME_MAX_LENGTH + '个字',
    },
    gender: {
      required: '未指定性别',
      type: '性别只能是男或女哦',
    },
    domain: {
      required: '请输入内容',
      type: '请输入内容',
      empty: '请输入内容',
      pattern: '只支持字母、数字、下划线',
    },
    verify_code: {
      required: '请输入验证码',
      type: '请输入验证码',
      empty: '请输入验证码',
      pattern: '验证码错误',
    },
    invite_code: {
      required: '请输入邀请码',
      type: '请输入邀请码',
      empty: '请输入邀请码',
    },
    career_company: {
      required: '请输入公司名称',
      type: '请输入公司名称',
      empty: '请输入公司名称',
      max: '公司名称不能超过' + limit.CAREER_COMPANY_MAX_LENGTH + '个字',
    },
    career_job: {
      required: '请输入职位名称',
      type: '请输入职位名称',
      empty: '请输入职位名称',
      max: '职位名称不能超过' + limit.CAREER_JOB_MAX_LENGTH + '个字',
    },
    career_description: {
      required: '请输入职业描述',
      type: '请输入职业描述',
      empty: '请输入职业描述',
      max: '职业描述最多不能超过' + limit.CAREER_DESCRIPTION_MAX_LENGTH + '个字',
    },
    education_college: {
      required: '缺少学校',
      type: '缺少学校',
      empty: '缺少学校',
      max: '学校不能超过' + limit.EDUCATION_COLLEGE_MAX_LENGTH + '个字',
    },
    education_speciality: {
      required: '缺少专业',
      type: '缺少专业',
      empty: '缺少专业',
      max: '专业不能超过' + limit.EDUCATION_SPECIALITY_MAX_LENGTH + '个字',
    },
    education_degree: {
      required: '缺少学历',
      type: '学历不符合要求',
    },
    education_description: {
      required: '请输入教育描述',
      type: '请输入教育描述',
      empty: '请输入教育描述',
      max: '教育描述最多不能超过' + limit.EDUCATION_DESCRIPTION_MAX_LENGTH + '个字',
    },
    page: {
      required: '缺少 page',
      type: 'page 类型错误',
      min: 'page 最少为 1',
    },
    page_size: {
      required: '缺少 page_size',
      type: 'page_size 类型错误',
      min: 'page_size 最少为 1',
    },
    sort_by: {
      required: '缺少 sort_by',
      type: 'sort_by 类型错误',
      empty: 'sort_by 不能为空',
    },
    sort_order: {
      required: '缺少 sort_order',
      type: 'sort_order 只能是 asc 或 desc',
    },
    start_date: {
      required: '缺少开始日期',
      pattern: '开始日期的格式错误',
    },
    end_date: {
      required: '缺少结束日期',
      pattern: '结束日期的格式错误',
    },
    anonymous: {
      required: '缺少 anonymous',
      type: 'anonymous 只能是 ' + limit.ANONYMOUS_YES + ' 或 ' + limit.ANONYMOUS_NO,
    },
    comment_content: {
      required: '请输入内容',
      type: '请输入内容',
      empty: '请输入内容',
      max: '内容不能超过' + limit.COMMENT_CONTENT_MAX_LENGTH + '个字',
    },
    post_title: {
      required: '请输入标题',
      type: '请输入标题',
      empty: '请输入标题',
      min: '标题不能少于' + limit.POST_TITLE_MIN_LENGTH + '个字',
      max: '标题不能超过' + limit.POST_TITLE_MAX_LENGTH + '个字',
    },
    post_content: {
      required: '请输入内容',
      type: '请输入内容',
      empty: '请输入内容',
      min: '内容不能少于' + limit.POST_CONTENT_MIN_LENGTH + '个字',
      max: '内容不能超过' + limit.POST_CONTENT_MAX_LENGTH + '个字',
    },
    consult_content: {
      required: '请输入内容',
      type: '请输入内容',
      empty: '请输入内容',
      max: '内容不能超过' + limit.CONSULT_CONTENT_MAX_LENGTH + '个字',
    },
    demand_title: {
      required: '请输入标题',
      type: '请输入标题',
      empty: '请输入标题',
      min: '标题不能少于' + limit.DEMAND_TITLE_MIN_LENGTH + '个字',
      max: '标题不能超过' + limit.DEMAND_TITLE_MAX_LENGTH + '个字',
    },
    demand_content: {
      required: '请输入内容',
      type: '请输入内容',
      empty: '请输入内容',
      min: '内容不能少于' + limit.DEMAND_CONTENT_MIN_LENGTH + '个字',
      max: '内容不能超过' + limit.DEMAND_CONTENT_MAX_LENGTH + '个字',
    },
    reply_content: {
      required: '请输入内容',
      type: '请输入内容',
      empty: '请输入内容',
      max: '内容不能超过' + limit.REPLY_CONTENT_MAX_LENGTH + '个字',
    },
    question_title: {
      required: '请输入标题',
      type: '请输入标题',
      empty: '请输入标题',
      min: '标题不能少于' + limit.QUESTION_TITLE_MIN_LENGTH + '个字',
      max: '标题不能超过' + limit.QUESTION_TITLE_MAX_LENGTH + '个字',
    },
    question_content: {
      required: '请输入内容',
      type: '请输入内容',
      empty: '请输入内容',
      min: '内容不能少于' + limit.QUESTION_CONTENT_MIN_LENGTH + '个字',
      max: '内容不能超过' + limit.QUESTION_CONTENT_MAX_LENGTH + '个字',
    },
    issue_content: {
      required: '请输入内容',
      type: '请输入内容',
      empty: '请输入内容',
      min: '内容不能少于' + limit.ISSUE_CONTENT_MIN_LENGTH + '个字',
      max: '内容不能超过' + limit.ISSUE_CONTENT_MAX_LENGTH + '个字',
    },
  }
)


module.exports = validator
