'use strict'

module.exports = options => {
  return async function notLogin(ctx, next) {
    let isLogin = await ctx.service.account.user.isLogin(ctx.query.access_token)
    if (isLogin) {
      ctx.body = '已登录，无法进行该操作'
    }
    else {
      await next()
    }
  }
}
