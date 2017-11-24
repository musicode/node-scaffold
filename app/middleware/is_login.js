'use strict'

/**
 * 确保用户已登录才能进行后续操作
 */
module.exports = options => {
  return async function isLogin(ctx, next) {
    let currentUser = await ctx.service.account.session.getCurrentUser()
    if (currentUser) {
      await next()
    }
    else {
      ctx.message = '未登录，无法进行该操作'
    }
  }
}
