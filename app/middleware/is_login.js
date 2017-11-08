'use strict'

module.exports = options => {
  return async function isLogin(ctx, next) {
    let isLogin = await ctx.service.account.user.isLogin(ctx.query.id)
    if (isLogin) {
      next()
    }
    else {
      ctx.body = '未登录，无法进行该操作'
    }
  }
}
