
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/feedback/issue.test.js', () => {

  describe('issue service', () => {

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

    it('issue crud', async () => {

      const ctx = app.mockContext()
      const { account, feedback } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      let errorCount = 0

      let content = 'hahahahahahahahahahhaahhahahahahahahahahahahahahahahhaahhahahahaha'
      let anonymous = app.limit.ANONYMOUS_YES

      // 参数必须要有 content
      try {
        await feedback.issue.createIssue({
          anonymous,
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
        errorCount++
      }

      assert(errorCount === 1)

      // 发表反馈必须登录
      try {
        await feedback.issue.createIssue({
          content,
          anonymous,
        })
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
        errorCount++
      }

      assert(errorCount === 2)

      currentUser = await account.user.signin({
        mobile: user.mobile,
        password: user.password,
      })

      // 创作数量
      let writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      // 反馈数量
      let issueCount = await feedback.issue.getIssueCount({
        user_id: currentUser.id,
      })
      assert(issueCount === 0)

      let issueList = await feedback.issue.getIssueList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(issueList.length === 0)

      let issueId = await feedback.issue.createIssue({
        content,
        anonymous,
      })

      assert(app.util.type(issueId) === 'number')

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      issueCount = await feedback.issue.getIssueCount({
        user_id: currentUser.id,
      })
      assert(issueCount === 1)

      issueList = await feedback.issue.getIssueList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(issueList.length === 1)


      let issue = await feedback.issue.getIssueById(issueId)
      assert(app.util.type(issue) === 'object')
      assert(issue.id === issueId)
      assert(issue.content === content)

      issue = await feedback.issue.getIssueById(issue)
      assert(app.util.type(issue) === 'object')
      assert(issue.id === issueId)
      assert(issue.content === content)

      issue = await feedback.issue.checkIssueAvailableById(issueId)
      assert(app.util.type(issue) === 'object')
      assert(issue.id === issueId)
      assert(issue.content === content)

      issue = await feedback.issue.checkIssueAvailableById(issue)
      assert(app.util.type(issue) === 'object')
      assert(issue.id === issueId)
      assert(issue.content === content)

      assert(issue.anonymous === anonymous)
      assert(issue.create_time.getTime() === issue.update_time.getTime())



      // 修改反馈
      let newContent = '213123213213123213213123213213123213213123213'

      await new Promise(resolve => {

        setTimeout(
          async () => {

            await feedback.issue.updateIssueById({ content: newContent }, issueId)

            issue = await feedback.issue.getIssueById(issueId)
            assert(app.util.type(issue) === 'object')

            assert(issue.content === newContent)
            assert(issue.anonymous === anonymous)

            const createTime = issue.create_time
            const updateTime = issue.update_time

            assert(createTime.getTime() < updateTime.getTime())

            resolve()
            
          },
          1000
        )
      })




      newContent = '213123213213123213213123213213123213213123213123'

      // 支持 issue 对象，节省一次查询
      await feedback.issue.updateIssueById({ content: newContent }, issue)

      issue = await feedback.issue.getIssueById(issueId)
      assert(app.util.type(issue) === 'object')

      assert(issue.content === newContent)
      assert(issue.anonymous === anonymous)





      await feedback.issue.deleteIssue(issueId)

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      issueCount = await feedback.issue.getIssueCount({
        user_id: currentUser.id,
      })
      assert(issueCount === 0)

      issueList = await feedback.issue.getIssueList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(issueList.length === 0)


      issue = await feedback.issue.checkIssueAvailableById(issueId)
      assert(app.util.type(issue) === 'object')

      try {
        await feedback.issue.checkIssueAvailableById(issueId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 3)


      issueId = await feedback.issue.createIssue({
        content,
        anonymous,
      })

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      issueCount = await feedback.issue.getIssueCount({
        user_id: currentUser.id,
      })
      assert(issueCount === 1)

      issueList = await feedback.issue.getIssueList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(issueList.length === 1)

      issue = await feedback.issue.checkIssueAvailableById(issueId)
      assert(app.util.type(issue) === 'object')


      // 支持 issue 对象删除，节省一次查询
      await feedback.issue.deleteIssue(issue)

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      issueCount = await feedback.issue.getIssueCount({
        user_id: currentUser.id,
      })
      assert(issueCount === 0)

      issueList = await feedback.issue.getIssueList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(issueList.length === 0)

      try {
        await feedback.issue.checkIssueAvailableById(issueId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 4)


    })


  })
})