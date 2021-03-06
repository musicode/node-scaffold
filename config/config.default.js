'use strict'

const os = require('os')
const path = require('path')
const qiniu = require('qiniu')
const moment = require('../app/moment')

/**
 *  @type {Object} appInfo
 * @property {string} appInfo.name package.json 里的 name
 * @property {string} appInfo.baseDir 项目根目录
 * @property {string} appInfo.HOME 用户根目录，如 /home/${username}/
 * @property {string} appInfo.root 应用根目录，在 local 和 unittest 环境下为 baseDir，其他环境为 HOME
 */
module.exports = appInfo => {

  const config = { }

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1509871538031_1201'

  config.system = {
    appMinVersion: '1.0.0',
    signupByInvite: false,
    ignoreInviteCode: true,
    ignoreVerifyCode: true,
    userViewByGuest: false,
    postViewByGuest: false,
    commentViewByGuest: false,
    demandViewByGuest: false,
    consultViewByGuest: false,
    questionViewByGuest: false,
    replyViewByGuest: false,
    issueViewByGuest: false,
    reportViewByGuest: false,
  }

  config.server = {
    search: '',
  }

  config.avatar = {
    male: '',
    female: '',
    group: '',
    anonymous: '',
  }

  config.sms = {
    signName: '产品名称',
    accessKey: '',
    secretKey: '',
  }

  config.view = {
    defaultViewEngine: 'etpl',
    defaultExtension: '.html',
  }

  config.etpl = {
    filters: {
      slice(source, start, end) {
        return source.slice(start, end)
      }
    }
  }

  config.qiniu = {
    accessKey: '',
    secretKey: '',
    // qiniu.zone.Zone_z0 华东
    // qiniu.zone.Zone_z1 华北
    // qiniu.zone.Zone_z2 华南
    // qiniu.zone.Zone_na0 北美
    zone: qiniu.zone.Zone_z0,
    imageBucket: 'image',
    imageCdnDomain: '',
    audioBucket: 'audio',
    audioCdnDomain: '',
    videoBucket: 'video',
    videoCdnDomain: '',
  }

  // 全局中间件
  config.middleware = [
    'errorHandler',
    'sessionHandler',
    'versionHandler',
  ]

  config.jsonp = {
    callback: 'callback',
    // 函数名最长为 100 个字符
    limit: 100,
  }

  config.security = {
    csrf: {
      enable: false,
      useSession: false,
      cookieName: 'csrf_token', // Cookie 中的字段名
      sessionName: 'csrf_token', // Session 中的字段名
    },
  }

  config.upload = {
    dir: os.tmpdir(),
  }

  // 因为运行时的配置会输出到 baseDir/run 目录
  // 因此这里统一把日志也输出到 baseDir/log 目录
  const logDir = path.join(appInfo.baseDir, 'log')
  const appLogName = 'app.log'
  const coreLogName = 'core.log'
  const agentLogName = 'agent.log'
  const errorLogName = 'error.log'

  config.logger = {
    dir: logDir,
    appLogName: appLogName,
    coreLogName: coreLogName,
    agentLogName: agentLogName,
    errorLogName: errorLogName,
    // 文件日志级别
    level: 'INFO',
    // 终端日志级别
    consoleLevel: 'DEBUG',
  }

  // 按小时拆分日志
  // 避免日志文件过大，编辑器很难打开
  config.logrotator = {
    filesRotateByHour: [
      path.join(logDir, appLogName),
      path.join(logDir, coreLogName),
      path.join(logDir, agentLogName),
      path.join(logDir, errorLogName),
    ]
  }

  config.mysql = {
    client: {
      host: 'mysql',
      port: '3306',
      user: 'test',
      password: 'password',
      database: 'test',
    },
  }

  config.redis = {
    client: {
      port: 6379,
      host: 'redis',
      password: '123456',
      db: 0,
    },
  }

  config.session = {
    currentUser: 'current_user',
    captcha: 'captcha',
    verifyCode: 'verify_code',
  }

  config.expireTime = {
    currentUser: moment.MONTH,
    captcha: 10 * moment.MINUTE,
    verifyCode: 10 * moment.MINUTE,
  }

  return config

}
