
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/trace/invite.test.js', () => {

  describe('invite service', () => {

    let user1
    let user2

    it('register a new user', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      let registerUser = async user => {
        let userId = await userService.signup({
          mobile: user.mobile,
          password: user.password,
          verify_code: '123133',
        })
        user.id = userId
        await userService.signout()
        return user
      }

      user1 = await registerUser({
        mobile: '1' + app.util.randomInt(10),
        password: '123456',
      })

      user2 = await registerUser({
        mobile: '1' + app.util.randomInt(10),
        password: '123456',
      })

    })

    it('invite question', async () => {

      const ctx = app.mockContext()
      const { account, qa, trace } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      // user1 发表一个问题
      currentUser = await account.user.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      let question = {
        title: '123421123',
        content: 'contentcontentcontentcontentcontentcontent'
      }

      question.id = await qa.question.createQuestion(question)

      // user2 被邀请回答的数量
      let inviteCount = await trace.invite.getInviteQuestionCount(null, user2.id)
      assert(inviteCount === 0)

      // user2 被邀请回答的提醒数量
      let inviteRemindCount = await trace.invite.getInviteQuestionRemindCount(user2.id)
      assert(inviteRemindCount === 0)

      // 作者收到未读提醒的数量
      let inviteUnreadRemindCount = await trace.invite.getInviteQuestionUnreadRemindCount(user2.id)
      assert(inviteUnreadRemindCount === 0)

      // user1 是否邀请了 user2 回答问题
      let hasInvite = await trace.invite.hasInviteQuestion(user1.id, user2.id, question.id)
      assert(hasInvite === false)

      // user1 是否邀请了 user2 回答问题之后是否发送了提醒
      let hasInviteRemind = await trace.invite.hasInviteQuestionRemind(user1.id, user2.id, question.id)
      assert(hasInviteRemind === false)



      await trace.invite.inviteQuestion(user2.id, question.id)



      inviteCount = await trace.invite.getInviteQuestionCount(null, user2.id)
      assert(inviteCount === 1)

      inviteRemindCount = await trace.invite.getInviteQuestionRemindCount(user2.id)
      assert(inviteRemindCount === 1)

      inviteUnreadRemindCount = await trace.invite.getInviteQuestionUnreadRemindCount(user2.id)
      assert(inviteUnreadRemindCount === 1)

      hasInvite = await trace.invite.hasInviteQuestion(user1.id, user2.id, question.id)
      assert(hasInvite === true)

      hasInviteRemind = await trace.invite.hasInviteQuestionRemind(user1.id, user2.id, question.id)
      assert(hasInviteRemind === true)


      // 标记已读
      await trace.invite.readInviteQuestionRemind(user2.id)

      inviteRemindCount = await trace.invite.getInviteQuestionRemindCount(user2.id)
      assert(inviteRemindCount === 1)

      inviteUnreadRemindCount = await trace.invite.getInviteQuestionUnreadRemindCount(user2.id)
      assert(inviteUnreadRemindCount === 0)


      let errorCount = 0

      // 不能再次邀请
      try {
        await trace.invite.inviteQuestion(user2.id, question.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_EXISTS)
        errorCount++
      }

      assert(errorCount === 1)



      await trace.invite.uninviteQuestion(user2.id, question.id)


      inviteCount = await trace.invite.getInviteQuestionCount(null, user2.id)
      assert(inviteCount === 0)

      inviteRemindCount = await trace.invite.getInviteQuestionRemindCount(user2.id)
      assert(inviteRemindCount === 0)

      inviteUnreadRemindCount = await trace.invite.getInviteQuestionUnreadRemindCount(user2.id)
      assert(inviteUnreadRemindCount === 0)

      hasInvite = await trace.invite.hasInviteQuestion(user1.id, user2.id, question.id)
      assert(hasInvite === false)

      hasInviteRemind = await trace.invite.hasInviteQuestionRemind(user1.id, user2.id, question.id)
      assert(hasInviteRemind === false)



      // 不能再次取消关注
      try {
        await trace.invite.uninviteQuestion(user2.id, question.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 2)




      await trace.invite.inviteQuestion(user2.id, question.id)



      inviteCount = await trace.invite.getInviteQuestionCount(null, user2.id)
      assert(inviteCount === 1)

      inviteRemindCount = await trace.invite.getInviteQuestionRemindCount(user2.id)
      assert(inviteRemindCount === 1)

      inviteUnreadRemindCount = await trace.invite.getInviteQuestionUnreadRemindCount(user2.id)
      assert(inviteUnreadRemindCount === 1)

      hasInvite = await trace.invite.hasInviteQuestion(user1.id, user2.id, question.id)
      assert(hasInvite === true)

      hasInviteRemind = await trace.invite.hasInviteQuestionRemind(user1.id, user2.id, question.id)
      assert(hasInviteRemind === true)

      await trace.invite.uninviteQuestion(user2.id, question.id)

    })


  })
})