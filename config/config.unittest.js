'use strict'

/**
 *  @type {Object} appInfo
 * @property {string} appInfo.name package.json 里的 name
 * @property {string} appInfo.baseDir 项目根目录
 * @property {string} appInfo.HOME 用户根目录，如 /home/${username}/
 * @property {string} appInfo.root 应用根目录，在 local 和 unittest 环境下为 baseDir，其他环境为 HOME
 */
module.exports = appInfo => {

  const config = { }

  config.system = {
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

  config.mysql = {
    client: {
      host: '127.0.0.1',
      port: '3306',
      user: 'root',
      password: '',
      database: 'jrd',
    },
  }

  config.redis = {
    client: {
      port: 6379,
      host: '127.0.0.1',
      password: '',
      db: 0,
    },
  }

  return config

}
