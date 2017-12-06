
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/qa/question.test.js', () => {

  describe('question service', () => {

    let user

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

      user = await registerUser({
        mobile: '1' + app.util.randomInt(10),
        password: '123456',
      })

    })

    it('question crud', async () => {

      const ctx = app.mockContext()
      const { account, qa, trace } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      let errorCount = 0

      let title = '123456789'
      let content = 'hahahahahahahahahahhaahhahahahahahahahahahahahahahahhaahhahahahaha'
      let anonymous = app.limit.ANONYMOUS_YES

      // 参数必须要有 content
      try {
        await qa.question.createQuestion({
          title,
          anonymous,
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
        errorCount++
      }

      assert(errorCount === 1)

      // 参数必须要有 title
      try {
        await qa.question.createQuestion({
          content,
          anonymous,
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
        errorCount++
      }

      assert(errorCount === 2)

      // 发表问题必须登录
      try {
        await qa.question.createQuestion({
          title,
          content,
          anonymous,
        })
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
        errorCount++
      }

      assert(errorCount === 3)

      currentUser = await account.user.signin({
        mobile: user.mobile,
        password: user.password,
      })

      // 创作数量
      let writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      // 问题数量
      let questionCount = await qa.question.getQuestionCount({
        user_id: currentUser.id,
      })
      assert(questionCount === 0)

      let questionList = await qa.question.getQuestionList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(questionList.length === 0)

      let questionId = await qa.question.createQuestion({
        title,
        content,
        anonymous,
      })

      assert(app.util.type(questionId) === 'number')

      // 不记入
      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      questionCount = await qa.question.getQuestionCount({
        user_id: currentUser.id,
      })
      assert(questionCount === 1)

      questionList = await qa.question.getQuestionList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(questionList.length === 1)


      let question = await qa.question.getQuestionById(questionId)
      assert(app.util.type(question) === 'object')
      assert(question.id === questionId)
      assert(question.content === undefined)

      question = await qa.question.getQuestionById(question)
      assert(app.util.type(question) === 'object')
      assert(question.id === questionId)
      assert(question.content === undefined)

      question = await qa.question.checkQuestionAvailableById(questionId)
      assert(app.util.type(question) === 'object')
      assert(question.id === questionId)
      assert(question.content === undefined)

      question = await qa.question.checkQuestionAvailableById(question)
      assert(app.util.type(question) === 'object')
      assert(question.id === questionId)
      assert(question.content === undefined)

      assert(question.title === title)
      assert(question.anonymous === anonymous)

      question = await qa.question.getFullQuestionById(question)
      assert(app.util.type(question) === 'object')
      assert(question.content === content)
      assert(question.create_time.getTime() === question.update_time.getTime())



      // 修改问题
      let newTitle = 'newtitle'
      let newContent = '213123213213123213213123213213123213213123213'

      await new Promise(resolve => {

        setTimeout(
          async () => {

            await qa.question.updateQuestionById({ title: newTitle, content: newContent }, questionId)

            question = await qa.question.getQuestionById(questionId)
            assert(app.util.type(question) === 'object')

            assert(question.title === newTitle)
            assert(question.content === undefined)
            assert(question.anonymous === anonymous)

            const createTime = question.create_time
            const updateTime = question.update_time

            assert(createTime.getTime() < updateTime.getTime())


            setTimeout(
              async () => {

                let content = '123haha'
                await qa.question.updateQuestionById({ content }, questionId)

                question = await qa.question.getFullQuestionById(questionId)
                assert(question.content === content)
                assert(updateTime.getTime() < question.update_time.getTime())

                resolve()

              },
              1000
            )
          },
          1000
        )
      })




      newTitle = 'newtitle11'
      newContent = '213123213213123213213123213213123213213123213123'

      // 支持 question 对象，节省一次查询
      await qa.question.updateQuestionById({ title: newTitle, content: newContent }, question)

      question = await qa.question.getQuestionById(questionId)
      assert(app.util.type(question) === 'object')

      assert(question.title === newTitle)
      assert(question.content === undefined)
      assert(question.anonymous === anonymous)





      await qa.question.deleteQuestion(questionId)

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      questionCount = await qa.question.getQuestionCount({
        user_id: currentUser.id,
      })
      assert(questionCount === 0)

      questionList = await qa.question.getQuestionList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(questionList.length === 0)


      question = await qa.question.checkQuestionAvailableById(questionId)
      assert(app.util.type(question) === 'object')

      try {
        await qa.question.checkQuestionAvailableById(questionId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 4)


      questionId = await qa.question.createQuestion({
        title,
        content,
        anonymous,
      })

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      questionCount = await qa.question.getQuestionCount({
        user_id: currentUser.id,
      })
      assert(questionCount === 1)

      questionList = await qa.question.getQuestionList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(questionList.length === 1)

      question = await qa.question.checkQuestionAvailableById(questionId)
      assert(app.util.type(question) === 'object')


      // 支持 question 对象删除，节省一次查询
      await qa.question.deleteQuestion(question)

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      questionCount = await qa.question.getQuestionCount({
        user_id: currentUser.id,
      })
      assert(questionCount === 0)

      questionList = await qa.question.getQuestionList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(questionList.length === 0)

      try {
        await qa.question.checkQuestionAvailableById(questionId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 5)


    })


  })
})