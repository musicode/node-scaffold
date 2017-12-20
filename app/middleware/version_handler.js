'use strict'

module.exports = (options, app) => {

  const { code, util, config } = app

  return async function versionHandler(ctx, next) {

    // 版本格式是 x.x.x
    const version = ctx.input.app_version

    if (util.type(version) !== 'string' || version.split('.').length !== 3) {
      util.throw(
        code.PERMISSION_DENIED,
        '无权限访问'
      )
    }

    if (version >= config.system.appMinVersion) {
      await next()
    }
    else {
      util.throw(
        code.CLIENT_NOT_SUPPORTED,
        'app 版本过低，请立即升级到最新版本'
      )
    }

  }
}