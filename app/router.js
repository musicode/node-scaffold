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

  app.get(
    '/api/v1/user/detail',
    v1.user.detail
  )

  // =============================================
  // 隐私设置
  // =============================================

  app.get(
    '/api/v1/privacy/profileAllowed/get',
    v1.privacy.getProfileAllowed
  )

  app.get(
    '/api/v1/privacy/profileAllowed/set',
    v1.privacy.setProfileAllowed
  )

  app.get(
    '/api/v1/privacy/activityDenied/get',
    v1.privacy.getActivityDenied
  )

  app.get(
    '/api/v1/privacy/activityDenied/set',
    v1.privacy.setActivityDenied
  )

  app.get(
    '/api/v1/privacy/activityBlocked/get',
    v1.privacy.getActivityBlocked
  )

  app.get(
    '/api/v1/privacy/activityBlocked/set',
    v1.privacy.setActivityBlocked
  )

  app.get(
    '/api/v1/privacy/blacklist/get',
    v1.privacy.getBlacklist
  )

  app.get(
    '/api/v1/privacy/blacklist/set',
    v1.privacy.setBlacklist
  )

  app.get(
    '/api/v1/privacy/blacklist/add',
    v1.privacy.addToBlacklist
  )

  app.get(
    '/api/v1/privacy/blacklist/remove',
    v1.privacy.removeFromBlacklist
  )

  app.get(
    '/api/v1/privacy/blacklist/has',
    v1.privacy.hasBlacked
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

  // =============================================
  // 文章
  // =============================================

  app.get(
    '/api/v1/post/create',
    v1.post.create
  )

  app.get(
    '/api/v1/post/update',
    v1.post.update
  )

  app.get(
    '/api/v1/post/delete',
    v1.post.delete
  )

  app.get(
    '/api/v1/post/list',
    v1.post.list
  )

  app.get(
    '/api/v1/post/detail',
    v1.post.detail
  )

  app.get(
    '/api/v1/post/view',
    v1.post.view
  )

  app.get(
    '/api/v1/post/follow',
    v1.post.follow
  )

  app.get(
    '/api/v1/post/follow/undo',
    v1.post.unfollow
  )

  app.get(
    '/api/v1/post/follow/count',
    v1.post.getFollowCount
  )

  app.get(
    '/api/v1/post/follow/list',
    v1.post.getFollowList
  )

  app.get(
    '/api/v1/post/like',
    v1.post.like
  )

  app.get(
    '/api/v1/post/like/undo',
    v1.post.unlike
  )

  app.get(
    '/api/v1/post/like/count',
    v1.post.getLikeCount
  )

  app.get(
    '/api/v1/post/like/list',
    v1.post.getLikeList
  )

  // =============================================
  // 评论
  // =============================================

  app.get(
    '/api/v1/comment/create',
    v1.comment.create
  )

  app.get(
    '/api/v1/comment/update',
    v1.comment.update
  )

  app.get(
    '/api/v1/comment/delete',
    v1.comment.delete
  )

  app.get(
    '/api/v1/comment/detail',
    v1.comment.detail
  )

  app.get(
    '/api/v1/comment/list',
    v1.comment.list
  )

  // =============================================
  // 项目
  // =============================================

  app.get(
    '/api/v1/demand/create',
    v1.demand.create
  )

  app.get(
    '/api/v1/demand/update',
    v1.demand.update
  )

  app.get(
    '/api/v1/demand/delete',
    v1.demand.delete
  )

  app.get(
    '/api/v1/demand/list',
    v1.demand.list
  )

  app.get(
    '/api/v1/demand/detail',
    v1.demand.detail
  )

  app.get(
    '/api/v1/demand/view',
    v1.demand.view
  )

  app.get(
    '/api/v1/demand/follow',
    v1.demand.follow
  )

  app.get(
    '/api/v1/demand/follow/undo',
    v1.demand.unfollow
  )

  app.get(
    '/api/v1/demand/follow/count',
    v1.demand.getFollowCount
  )

  app.get(
    '/api/v1/demand/follow/list',
    v1.demand.getFollowList
  )

  app.get(
    '/api/v1/demand/like',
    v1.demand.like
  )

  app.get(
    '/api/v1/demand/like/undo',
    v1.demand.unlike
  )

  app.get(
    '/api/v1/demand/like/count',
    v1.demand.getLikeCount
  )

  app.get(
    '/api/v1/demand/like/list',
    v1.demand.getLikeList
  )

  // =============================================
  // 咨询
  // =============================================

  app.get(
    '/api/v1/consult/create',
    v1.consult.create
  )

  app.get(
    '/api/v1/consult/update',
    v1.consult.update
  )

  app.get(
    '/api/v1/consult/delete',
    v1.consult.delete
  )

  app.get(
    '/api/v1/consult/detail',
    v1.consult.detail
  )

  app.get(
    '/api/v1/consult/list',
    v1.consult.list
  )

  // =============================================
  // 问题
  // =============================================

  app.get(
    '/api/v1/question/create',
    v1.question.create
  )

  app.get(
    '/api/v1/question/update',
    v1.question.update
  )

  app.get(
    '/api/v1/question/delete',
    v1.question.delete
  )

  app.get(
    '/api/v1/question/list',
    v1.question.list
  )

  app.get(
    '/api/v1/question/detail',
    v1.question.detail
  )

  app.get(
    '/api/v1/question/view',
    v1.question.view
  )

  app.get(
    '/api/v1/question/follow',
    v1.question.follow
  )

  app.get(
    '/api/v1/question/follow/undo',
    v1.question.unfollow
  )

  app.get(
    '/api/v1/question/follow/count',
    v1.question.getFollowCount
  )

  app.get(
    '/api/v1/question/follow/list',
    v1.question.getFollowList
  )

  app.get(
    '/api/v1/question/like',
    v1.question.like
  )

  app.get(
    '/api/v1/question/like/undo',
    v1.question.unlike
  )

  app.get(
    '/api/v1/question/like/count',
    v1.question.getLikeCount
  )

  app.get(
    '/api/v1/question/like/list',
    v1.question.getLikeList
  )

  // =============================================
  // 回复
  // =============================================

  app.get(
    '/api/v1/reply/create',
    v1.reply.create
  )

  app.get(
    '/api/v1/reply/update',
    v1.reply.update
  )

  app.get(
    '/api/v1/reply/delete',
    v1.reply.delete
  )

  app.get(
    '/api/v1/reply/detail',
    v1.reply.detail
  )

  app.get(
    '/api/v1/reply/list',
    v1.reply.list
  )

  // =============================================
  // 反馈
  // =============================================

  app.get(
    '/api/v1/issue/create',
    v1.issue.create
  )

  // =============================================
  // 举报
  // =============================================

  app.get(
    '/api/v1/report/create',
    v1.report.create
  )

}
