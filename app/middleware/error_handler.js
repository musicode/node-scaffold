'use strict'

module.exports = (options, app) => {

  const { code } = app

  return async function errorHandler(ctx, next) {

    // 方便在控制台查看请求
    console.log('')
    console.log('')
    console.log('')
    console.log('')
    console.log(ctx.request.url)
    console.log('')
    console.log('')

    let responseCode
    let responseMsg

    try {
      await next()
      if (ctx._matchedRoute) {
        responseCode = code.SUCCESS
        responseMsg = 'success'
      }
      // 未匹配路由，表示 404 了
      else {
        responseCode = code.RESOURCE_NOT_FOUND
        responseMsg = 'not found'
      }
    }
    catch (err) {
      // 注意：自定义的错误统一处理函数捕捉到错误后也要 `app.emit('error', err, this)`
      // 框架会统一监听，并打印对应的错误日志
      ctx.app.emit('error', err, ctx)
      // 自定义错误时异常返回的格式
      responseCode = err.code || code.FAILURE
      responseMsg = err.message
    }

    if (!ctx.body) {
      ctx.body = {
        code: responseCode,
        data: ctx.output,
        msg: responseMsg,
        ts: Date.now(),
      }
    }

  }
}