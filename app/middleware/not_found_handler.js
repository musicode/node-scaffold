'use strict'

module.exports = options => {
  return async function notFoundHandler(ctx, next) {
    console.log('found1')
    await next()
    console.log('found2')
    if (ctx.status === 404 && !ctx.body) {
      if (ctx.acceptJSON) {
        ctx.body = { error: 'Not Found' }
      }
      else {
        ctx.body = '<h1>Page Not Found</h1>'
      }
    }
  }
}
