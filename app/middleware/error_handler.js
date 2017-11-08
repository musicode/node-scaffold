'use strict'

module.exports = options => {
  return async function errorHandler(ctx, next) {
    console.log('err1')
    try {
      await next()
      console.log('err2')
    }
    catch (err) {
      // 注意：自定义的错误统一处理函数捕捉到错误后也要 `app.emit('error', err, this)`
      // 框架会统一监听，并打印对应的错误日志
      ctx.app.emit('error', err, ctx)
      // 自定义错误时异常返回的格式
      ctx.body = {
        code: err.code
      }
    }
    console.log('err4')
  }
}