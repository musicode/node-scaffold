'use strict'

module.exports = (options, app) => {

  const { code } = app

  return async function errorHandler(ctx, next) {

    const body = { }

    try {
      await next()
      if (ctx._matchedRoute) {
        body.code = code.SUCCESS
        body.msg = 'success'
      }
      // 未匹配路由，表示 404 了
      else {
        body.code = code.RESOURCE_NOT_FOUND
        body.msg = 'not found'
      }
    }
    catch (err) {
      // 注意：自定义的错误统一处理函数捕捉到错误后也要 `app.emit('error', err, this)`
      // 框架会统一监听，并打印对应的错误日志
      ctx.app.emit('error', err, ctx)
      // 自定义错误时异常返回的格式
      body.code = err.code || code.FAILURE
      body.msg = err.message
    }

    body.data = ctx.output
    body.ts = Date.now()

    if (!ctx.body) {
      ctx.body = body
    }

  }
}