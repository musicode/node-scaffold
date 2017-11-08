'use strict'

module.exports = app => {
  const { middleware, controller } = app
  app.get(
    '/api/v1/auth/signup',
    middleware.notLogin(),
    controller.api.v1.account.auth.signup
  )
}
