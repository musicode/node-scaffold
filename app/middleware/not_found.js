'use strict'

const code = require('../constant/code')

module.exports = options => {
  return async function notFound(ctx, next) {
    console.log('21')
    await next()
    console.log(22, ctx.status)
    if (ctx.status === 404) {
      throw new Error('not found', code.RESOURCE_NOT_FOUND)
    }
  }
}
