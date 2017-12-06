
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/qa/reply.test.js', () => {

  describe('reply service', () => {

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

    it('reply crud', async () => {

      const ctx = app.mockContext()
      const { account, qa, trace } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      // user1 发表问题
      currentUser = await account.user.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      let errorCount = 0

      let title = '123456789'
      let content = 'hahahahahahahahahahhaahhahahahahahahahahahahahahahahhaahhahahahaha'
      let anonymous = app.limit.ANONYMOUS_YES

      let questionId = await qa.question.createQuestion({
        title,
        content,
        anonymous,
      })

      // 创作数量
      let writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 0)

      // 回复数量
      let replyCount = await qa.reply.getReplyCount({
        question_id: questionId,
      })
      assert(replyCount === 0)

      // 回复列表
      let replyList = await qa.reply.getReplyList(
        {
          question_id: questionId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(replyList.length === 0)


      // 作者自己发表回复
      let replyId = await qa.reply.createReply({
        question_id: questionId,
        content,
        anonymous,
      })

      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 1)

      replyCount = await qa.reply.getReplyCount({
        question_id: questionId,
      })
      assert(replyCount === 1)

      replyList = await qa.reply.getReplyList(
        {
          question_id: questionId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(replyList.length === 1)




      // 各种获取回复
      let reply = await qa.reply.getReplyById(replyId)
      assert(app.util.type(reply) === 'object')
      assert(reply.id === replyId)
      assert(reply.content === undefined)

      reply = await qa.reply.getReplyById(reply)
      assert(app.util.type(reply) === 'object')
      assert(reply.id === replyId)
      assert(reply.content === undefined)

      reply = await qa.reply.checkReplyAvailableById(replyId)
      assert(app.util.type(reply) === 'object')
      assert(reply.id === replyId)
      assert(reply.content === undefined)

      reply = await qa.reply.checkReplyAvailableById(reply)
      assert(app.util.type(reply) === 'object')
      assert(reply.id === replyId)
      assert(reply.content === undefined)

      assert(reply.anonymous === anonymous)

      reply = await qa.reply.getFullReplyById(reply)
      assert(app.util.type(reply) === 'object')
      assert(reply.content === content)
      assert(reply.create_time.getTime() === reply.update_time.getTime())


      // 修改回复
      let newContent = '213123213213123213213123213213123213213123213'

      await new Promise(resolve => {

        setTimeout(
          async () => {

            await qa.reply.updateReplyById({ content: newContent }, replyId)

            reply = await qa.reply.getReplyById(replyId)
            assert(app.util.type(reply) === 'object')
            assert(reply.content === undefined)
            assert(reply.anonymous === anonymous)

            assert(reply.create_time.getTime() === reply.update_time.getTime())

            reply = await qa.reply.getFullReplyById(replyId)
            assert(reply.content === newContent)
            assert(reply.create_time.getTime() < reply.update_time.getTime())

            resolve()
          },
          1000
        )
      })


      newContent = 'aaa213123213213123213213123213213123213213123213123'

      // 支持 reply 对象，节省一次查询
      await qa.reply.updateReplyById({ content: newContent }, reply)

      reply = await qa.reply.getReplyById(replyId)
      assert(app.util.type(reply) === 'object')
      assert(reply.content === undefined)
      assert(reply.anonymous === anonymous)

      reply = await qa.reply.getFullReplyById(replyId)
      assert(reply.content === newContent)



      let parentId = replyId
      // 回复回复
      replyId = await qa.reply.createReply({
        question_id: questionId,
        parent_id: parentId,
        root_id: parentId,
        content,
        anonymous,
      })

      assert(app.util.type(replyId) === 'number')

      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 1)

      replyCount = await qa.reply.getReplyCount({
        question_id: questionId,
      })
      assert(replyCount === 2)

      let subCount = await qa.question.getQuestionSubCount(questionId)
      assert(replyCount === 2)

      replyCount = await qa.reply.getReplyCount({
        parent_id: parentId,
      })
      assert(replyCount === 1)

      subCount = await qa.reply.getReplySubCount(questionId)
      assert(replyCount === 1)


      try {
        await qa.question.deleteQuestion(questionId)
      }
      catch (err) {
        assert(err.code === app.code.PERMISSION_DENIED)
        errorCount++
      }
      assert(errorCount === 1)


      try {
        await qa.reply.deleteReply(parentId)
      }
      catch (err) {
        assert(err.code === app.code.PERMISSION_DENIED)
        errorCount++
      }
      assert(errorCount === 2)


      await qa.reply.deleteReply(replyId)


      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 1)

      replyCount = await qa.reply.getReplyCount({
        question_id: questionId,
      })
      assert(replyCount === 1)

      replyList = await qa.reply.getReplyList(
        {
          question_id: questionId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(replyList.length === 1)


      reply = await qa.reply.checkReplyAvailableById(replyId)
      assert(app.util.type(reply) === 'object')

      try {
        await qa.reply.checkReplyAvailableById(replyId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }
      assert(errorCount === 3)





      await qa.reply.deleteReply(parentId)


      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 0)

      replyCount = await qa.reply.getReplyCount({
        question_id: questionId,
      })
      assert(replyCount === 0)

      replyList = await qa.reply.getReplyList(
        {
          question_id: questionId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(replyList.length === 0)



      await qa.question.deleteQuestion(questionId)


    })


  })
})