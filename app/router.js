'use strict'

module.exports = app => {
  const { middleware, controller } = app

  app.get(
    '/api/v1/auth/signup',
    controller.api.v1.auth.signup
  )

  app.get(
    '/api/v1/auth/signin',
    controller.api.v1.auth.signin
  )

  app.get(
    '/api/v1/auth/signout',
    controller.api.v1.auth.signout
  )

  app.get(
    '/api/v1/user/email/update',
    controller.api.v1.user.email.update
  )

  app.get(
    '/api/v1/user/mobile/update',
    controller.api.v1.user.mobile.update
  )

  app.get(
    '/api/v1/user/password/update',
    controller.api.v1.user.password.update
  )

  app.get(
    '/api/v1/user/update',
    controller.api.v1.user.update
  )

}
