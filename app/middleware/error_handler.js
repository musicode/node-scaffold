'use strict'

const code = require('../constant/code')

module.exports = options => {
  return async function errorHandler(ctx, next) {
    try {
      await next()
      if (ctx._matchedRoute) {
        ctx.body = {
          code: code.SUCCESS,
          data: ctx.output,
          msg: 'success',
        }
      }
      // 未匹配路由，表示 404 了
      else {
        ctx.body = {
          code: code.RESOURCE_NOT_FOUND,
          msg: 'not found',
        }
      }
    }
    catch (err) {
      // 注意：自定义的错误统一处理函数捕捉到错误后也要 `app.emit('error', err, this)`
      // 框架会统一监听，并打印对应的错误日志
      ctx.app.emit('error', err, ctx)
      // 自定义错误时异常返回的格式
      ctx.body = {
        code: err.code || code.FAILURE,
        data: ctx.output,
        msg: err.message,
      }
    }
  }
}