'use strict'

module.exports = options => {
  return async function errorHandler(ctx, next) {
    console.log('err1')
    try {
      await next()
      console.log('err2')
    }
    catch (e) {
      console.log('err3')
    }
    console.log('err4')
  }
}