'use strict'

module.exports = app => {

  const { controller } = app
  const { v1 } = controller

  app.post(
    '/v1/auth/signup',
    v1.auth.signup
  )

  app.post(
    '/v1/auth/signin',
    v1.auth.signin
  )

  app.post(
    '/v1/auth/signout',
    v1.auth.signout
  )

  // =============================================
  // 修改资料
  // =============================================
  app.post(
    '/v1/user/email/update',
    v1.user.setEmail
  )

  app.post(
    '/v1/user/mobile/update',
    v1.user.setMobile
  )

  app.post(
    '/v1/user/password/update',
    v1.user.setPassword
  )

  app.post(
    '/v1/user/password/reset',
    v1.user.resetPassword
  )

  app.post(
    '/v1/user/update',
    v1.user.setUserInfo
  )

  app.post(
    '/v1/user/detail',
    v1.user.detail
  )

  // =============================================
  // 隐私设置
  // =============================================

  app.post(
    '/v1/privacy/profileAllowed/get',
    v1.privacy.getProfileAllowed
  )

  app.post(
    '/v1/privacy/profileAllowed/set',
    v1.privacy.setProfileAllowed
  )

  app.post(
    '/v1/privacy/activityDenied/get',
    v1.privacy.getActivityDenied
  )

  app.post(
    '/v1/privacy/activityDenied/set',
    v1.privacy.setActivityDenied
  )

  app.post(
    '/v1/privacy/activityBlocked/get',
    v1.privacy.getActivityBlocked
  )

  app.post(
    '/v1/privacy/activityBlocked/set',
    v1.privacy.setActivityBlocked
  )

  app.post(
    '/v1/privacy/blacklist/get',
    v1.privacy.getBlacklist
  )

  app.post(
    '/v1/privacy/blacklist/set',
    v1.privacy.setBlacklist
  )

  app.post(
    '/v1/privacy/blacklist/add',
    v1.privacy.addToBlacklist
  )

  app.post(
    '/v1/privacy/blacklist/remove',
    v1.privacy.removeFromBlacklist
  )

  app.post(
    '/v1/privacy/blacklist/has',
    v1.privacy.hasBlacked
  )

  // =============================================
  // 职业经历
  // =============================================
  app.post(
    '/v1/user/career/create',
    v1.career.create
  )

  app.post(
    '/v1/user/career/update',
    v1.career.update
  )

  app.post(
    '/v1/user/career/delete',
    v1.career.delete
  )

  app.post(
    '/v1/user/career/list',
    v1.career.list
  )

  // =============================================
  // 教育经历
  // =============================================
  app.post(
    '/v1/user/education/create',
    v1.education.create
  )

  app.post(
    '/v1/user/education/update',
    v1.education.update
  )

  app.post(
    '/v1/user/education/delete',
    v1.education.delete
  )

  app.post(
    '/v1/user/education/list',
    v1.education.list
  )

  // =============================================
  // 邀请码
  // =============================================
  app.post(
    '/v1/inviteCode/create',
    v1.inviteCode.create
  )

  app.post(
    '/v1/inviteCode/list',
    v1.inviteCode.list
  )

  // =============================================
  // 关注与粉丝
  // =============================================
  app.post(
    '/v1/relation/follow',
    v1.relation.follow
  )

  app.post(
    '/v1/relation/follow/undo',
    v1.relation.unfollow
  )

  app.post(
    '/v1/relation/is',
    v1.relation.is
  )

  app.post(
    '/v1/relation/followee/count',
    v1.relation.followeeCount
  )

  app.post(
    '/v1/relation/followee/list',
    v1.relation.followeeList
  )

  app.post(
    '/v1/relation/follower/count',
    v1.relation.followerCount
  )

  app.post(
    '/v1/relation/follower/list',
    v1.relation.followerList
  )

  // =============================================
  // 文章
  // =============================================

  app.post(
    '/v1/post/create',
    v1.post.create
  )

  app.post(
    '/v1/post/update',
    v1.post.update
  )

  app.post(
    '/v1/post/delete',
    v1.post.delete
  )

  app.post(
    '/v1/post/list',
    v1.post.list
  )

  app.post(
    '/v1/post/detail',
    v1.post.detail
  )

  app.post(
    '/v1/post/view',
    v1.post.view
  )

  app.post(
    '/v1/post/follow',
    v1.post.follow
  )

  app.post(
    '/v1/post/follow/undo',
    v1.post.unfollow
  )

  app.post(
    '/v1/post/follow/count',
    v1.post.getFollowCount
  )

  app.post(
    '/v1/post/follow/list',
    v1.post.getFollowList
  )

  app.post(
    '/v1/post/like',
    v1.post.like
  )

  app.post(
    '/v1/post/like/undo',
    v1.post.unlike
  )

  app.post(
    '/v1/post/like/count',
    v1.post.getLikeCount
  )

  app.post(
    '/v1/post/like/list',
    v1.post.getLikeList
  )

  // =============================================
  // 评论
  // =============================================

  app.post(
    '/v1/comment/create',
    v1.comment.create
  )

  app.post(
    '/v1/comment/update',
    v1.comment.update
  )

  app.post(
    '/v1/comment/delete',
    v1.comment.delete
  )

  app.post(
    '/v1/comment/detail',
    v1.comment.detail
  )

  app.post(
    '/v1/comment/list',
    v1.comment.list
  )

  // =============================================
  // 项目
  // =============================================

  app.post(
    '/v1/demand/create',
    v1.demand.create
  )

  app.post(
    '/v1/demand/update',
    v1.demand.update
  )

  app.post(
    '/v1/demand/delete',
    v1.demand.delete
  )

  app.post(
    '/v1/demand/list',
    v1.demand.list
  )

  app.post(
    '/v1/demand/detail',
    v1.demand.detail
  )

  app.post(
    '/v1/demand/view',
    v1.demand.view
  )

  app.post(
    '/v1/demand/follow',
    v1.demand.follow
  )

  app.post(
    '/v1/demand/follow/undo',
    v1.demand.unfollow
  )

  app.post(
    '/v1/demand/follow/count',
    v1.demand.getFollowCount
  )

  app.post(
    '/v1/demand/follow/list',
    v1.demand.getFollowList
  )

  app.post(
    '/v1/demand/like',
    v1.demand.like
  )

  app.post(
    '/v1/demand/like/undo',
    v1.demand.unlike
  )

  app.post(
    '/v1/demand/like/count',
    v1.demand.getLikeCount
  )

  app.post(
    '/v1/demand/like/list',
    v1.demand.getLikeList
  )

  // =============================================
  // 咨询
  // =============================================

  app.post(
    '/v1/consult/create',
    v1.consult.create
  )

  app.post(
    '/v1/consult/update',
    v1.consult.update
  )

  app.post(
    '/v1/consult/delete',
    v1.consult.delete
  )

  app.post(
    '/v1/consult/detail',
    v1.consult.detail
  )

  app.post(
    '/v1/consult/list',
    v1.consult.list
  )

  // =============================================
  // 问题
  // =============================================

  app.post(
    '/v1/question/create',
    v1.question.create
  )

  app.post(
    '/v1/question/update',
    v1.question.update
  )

  app.post(
    '/v1/question/delete',
    v1.question.delete
  )

  app.post(
    '/v1/question/list',
    v1.question.list
  )

  app.post(
    '/v1/question/detail',
    v1.question.detail
  )

  app.post(
    '/v1/question/view',
    v1.question.view
  )

  app.post(
    '/v1/question/follow',
    v1.question.follow
  )

  app.post(
    '/v1/question/follow/undo',
    v1.question.unfollow
  )

  app.post(
    '/v1/question/follow/count',
    v1.question.getFollowCount
  )

  app.post(
    '/v1/question/follow/list',
    v1.question.getFollowList
  )

  app.post(
    '/v1/question/like',
    v1.question.like
  )

  app.post(
    '/v1/question/like/undo',
    v1.question.unlike
  )

  app.post(
    '/v1/question/like/count',
    v1.question.getLikeCount
  )

  app.post(
    '/v1/question/like/list',
    v1.question.getLikeList
  )

  app.post(
    '/v1/question/invite',
    v1.question.invite
  )

  app.post(
    '/v1/question/invite/undo',
    v1.question.uninvite
  )

  app.post(
    '/v1/question/invite/list',
    v1.question.inviteList
  )

  app.post(
    '/v1/question/invite/ignore',
    v1.question.ignoreInvite
  )

  app.post(
    '/v1/question/invite/suggestion',
    v1.question.inviteSuggestion
  )

  // =============================================
  // 回复
  // =============================================

  app.post(
    '/v1/reply/create',
    v1.reply.create
  )

  app.post(
    '/v1/reply/update',
    v1.reply.update
  )

  app.post(
    '/v1/reply/delete',
    v1.reply.delete
  )

  app.post(
    '/v1/reply/detail',
    v1.reply.detail
  )

  app.post(
    '/v1/reply/list',
    v1.reply.list
  )

  // =============================================
  // 反馈
  // =============================================

  app.post(
    '/v1/issue/create',
    v1.issue.create
  )

  // =============================================
  // 举报
  // =============================================

  app.post(
    '/v1/report/create',
    v1.report.create
  )

  // =============================================
  // 上传
  // =============================================

  app.post(
    '/v1/upload/image',
    v1.upload.image
  )

  app.post(
    '/v1/upload/audio',
    v1.upload.audio
  )

  app.post(
    '/v1/upload/video',
    v1.upload.video
  )

  // =============================================
  // 提醒
  // =============================================

  app.post(
    '/v1/remind/unreadCount',
    v1.remind.unreadCount
  )

  // =============================================
  // 短信
  // =============================================

  app.post(
    '/v1/sms/signup',
    v1.sms.signup
  )

  // =============================================
  // 动态
  // =============================================

  app.post(
    '/v1/trace/friend',
    v1.trace.friend
  )

  app.post(
    '/v1/sync',
    v1.system.sync
  )

  app.post(
    '/v1/search',
    v1.system.search
  )

}
