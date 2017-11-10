'use strict'

module.exports = options => {
  return async function notLogin(ctx, next) {
    let currentUser = await ctx.getCurrentUser()
    if (!currentUser) {
      await next()
    }
    else {
      ctx.body = '已登录，无法进行该操作'
    }
  }
}
