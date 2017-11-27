'use strict'

module.exports = app => {

  const { controller } = app
  const { v1 } = controller.api

  app.get(
    '/api/v1/auth/signup',
    v1.auth.signup
  )

  app.get(
    '/api/v1/auth/signin',
    v1.auth.signin
  )

  app.get(
    '/api/v1/auth/signout',
    v1.auth.signout
  )

  // =============================================
  // 修改资料
  // =============================================
  app.get(
    '/api/v1/user/email/update',
    v1.user.setEmail
  )

  app.get(
    '/api/v1/user/mobile/update',
    v1.user.setMobile
  )

  app.get(
    '/api/v1/user/password/update',
    v1.user.setPassword
  )

  app.get(
    '/api/v1/user/password/reset',
    v1.user.resetPassword
  )

  app.get(
    '/api/v1/user/update',
    v1.user.setUserInfo
  )

  // =============================================
  // 隐私设置
  // =============================================
  app.get(
    '/api/v1/privacy/activityDenied/get',
    v1.privacy.getActivityDenied
  )

  app.get(
    '/api/v1/privacy/activityDenied/set',
    v1.privacy.setActivityDenied
  )

  // =============================================
  // 职业经历
  // =============================================
  app.get(
    '/api/v1/user/career/create',
    v1.user.career.create
  )

  app.get(
    '/api/v1/user/career/update',
    v1.user.career.update
  )

  app.get(
    '/api/v1/user/career/delete',
    v1.user.career.delete
  )

  app.get(
    '/api/v1/user/career/list',
    v1.user.career.list
  )

  // =============================================
  // 教育经历
  // =============================================
  app.get(
    '/api/v1/user/education/create',
    v1.user.education.create
  )

  app.get(
    '/api/v1/user/education/update',
    v1.user.education.update
  )

  app.get(
    '/api/v1/user/education/delete',
    v1.user.education.delete
  )

  app.get(
    '/api/v1/user/education/list',
    v1.user.education.list
  )

  // =============================================
  // 邀请码
  // =============================================
  app.get(
    '/api/v1/inviteCode/create',
    v1.inviteCode.create
  )

  app.get(
    '/api/v1/inviteCode/list',
    v1.inviteCode.list
  )

  // =============================================
  // 关注与粉丝
  // =============================================
  app.get(
    '/api/v1/relation/follow',
    v1.relation.follow
  )

  app.get(
    '/api/v1/relation/follow/undo',
    v1.relation.unfollow
  )

  app.get(
    '/api/v1/relation/is',
    v1.relation.is
  )

  app.get(
    '/api/v1/relation/followee/count',
    v1.relation.followeeCount
  )

  app.get(
    '/api/v1/relation/followee/list',
    v1.relation.followeeList
  )

  app.get(
    '/api/v1/relation/follower/count',
    v1.relation.followerCount
  )

  app.get(
    '/api/v1/relation/follower/list',
    v1.relation.followerList
  )

}
