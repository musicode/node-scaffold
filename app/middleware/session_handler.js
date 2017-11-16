'use strict'

const noop = new Function()

module.exports = (options, app) => {
  return async function errorHandler(ctx, next) {

    let callback = noop

    let accessToken = ctx.input.access_token
    if (!accessToken) {
      accessToken = ctx.cookies.get('access_token')
      if (!accessToken) {
        accessToken = ctx.helper.uuid()
        callback = async function () {
          ctx.output.access_token = accessToken
          // 如果对方有 cookie 功能
          await ctx.cookies.set(
            'access_token',
            accessToken,
            {
              maxAge: app.config.session.maxAge,
            }
          )
        }
      }
    }

    ctx.accessToken = accessToken

    try {
      await next()
      await callback()
    }
    catch (err) {
      await callback()
      throw err
    }

  }
}