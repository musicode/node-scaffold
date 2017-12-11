
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/trace/view.test.js', () => {

  describe('view service', () => {

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

    it('view post', async () => {

      const ctx = app.mockContext()
      const { account, article, trace } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      // user1 发表一篇文章
      currentUser = await account.user.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      let post = {
        title: '123421123',
        content: 'contentcontentcontentcontentcontentcontent'
      }

      post.id = await article.post.createPost(post)


      await account.user.signout()

      // user2 浏览该文章

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      // 文章总浏览数
      let viewCount = await trace.view.getViewPostCount(post.id)
      assert(viewCount === 0)

      viewCount = await article.post.getPostViewCount(post.id)
      assert(viewCount === 0)

      // 作者收到提醒的数量
      let viewRemindCount = await trace.view.getViewPostRemindCount(user1.id)
      assert(viewRemindCount === 0)

      // 作者收到未读提醒的数量
      let viewUnreadRemindCount = await trace.view.getViewPostUnreadRemindCount(user1.id)
      assert(viewUnreadRemindCount === 0)

      // user2 是否浏览了 user1 的文章
      let hasView = await trace.view.hasViewPost(post.id, user2.id)
      assert(hasView === false)

      // user2 是否浏览了 user1 的文章之后是否发送了提醒
      let hasViewRemind = await trace.view.hasViewPostRemind(post.id, user2.id)
      assert(hasViewRemind === false)



      await trace.view.viewPost(post.id)



      viewCount = await trace.view.getViewPostCount(post.id)
      assert(viewCount === 1)

      viewCount = await article.post.getPostViewCount(post.id)
      assert(viewCount === 1)

      viewRemindCount = await trace.view.getViewPostRemindCount(user1.id)
      assert(viewRemindCount === 1)

      viewUnreadRemindCount = await trace.view.getViewPostUnreadRemindCount(user1.id)
      assert(viewUnreadRemindCount === 1)

      hasView = await trace.view.hasViewPost(post.id, user2.id)
      assert(hasView === true)

      hasViewRemind = await trace.view.hasViewPostRemind(post.id, user2.id)
      assert(hasViewRemind === true)


      // 标记已读
      await trace.view.readViewPostRemind(user1.id)

      viewRemindCount = await trace.view.getViewPostRemindCount(user1.id)
      assert(viewRemindCount === 1)

      viewUnreadRemindCount = await trace.view.getViewPostUnreadRemindCount(user1.id)
      assert(viewUnreadRemindCount === 0)


      let errorCount = 0

      // 可以再次浏览
      try {
        await trace.view.viewPost(post.id)
      }
      catch (err) {
        errorCount++
      }

      assert(errorCount === 0)

      // 浏览量怎么累计是个问题
      // 这里 trace_view 表不会每次浏览都 insert
      // 因此他的数据总量是不会变的

      viewCount = await trace.view.getViewPostCount(post.id)
      assert(viewCount === 1)

      // 但是对于资源来说，计数器是需要累加的

      viewCount = await article.post.getPostViewCount(post.id)
      assert(viewCount === 2)

    })

    it('view demand', async () => {

      const ctx = app.mockContext()
      const { account, project, trace } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      // user1 发表一个项目
      currentUser = await account.user.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      let demand = {
        title: '123421123',
        content: 'contentcontentcontentcontentcontentcontent'
      }

      demand.id = await project.demand.createDemand(demand)


      await account.user.signout()

      // user2 浏览该项目

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      // 项目总浏览数
      let viewCount = await trace.view.getViewDemandCount(demand.id)
      assert(viewCount === 0)

      viewCount = await project.demand.getDemandViewCount(demand.id)
      assert(viewCount === 0)

      // 作者收到提醒的数量
      let viewRemindCount = await trace.view.getViewDemandRemindCount(user1.id)
      assert(viewRemindCount === 0)

      // 作者收到未读提醒的数量
      let viewUnreadRemindCount = await trace.view.getViewDemandUnreadRemindCount(user1.id)
      assert(viewUnreadRemindCount === 0)

      // user2 是否浏览了 user1 的项目
      let hasView = await trace.view.hasViewDemand(demand.id, user2.id)
      assert(hasView === false)

      // user2 是否浏览了 user1 的项目之后是否发送了提醒
      let hasViewRemind = await trace.view.hasViewDemandRemind(demand.id, user2.id)
      assert(hasViewRemind === false)



      await trace.view.viewDemand(demand.id)



      viewCount = await trace.view.getViewDemandCount(demand.id)
      assert(viewCount === 1)

      viewCount = await project.demand.getDemandViewCount(demand.id)
      assert(viewCount === 1)

      viewRemindCount = await trace.view.getViewDemandRemindCount(user1.id)
      assert(viewRemindCount === 1)

      viewUnreadRemindCount = await trace.view.getViewDemandUnreadRemindCount(user1.id)
      assert(viewUnreadRemindCount === 1)

      hasView = await trace.view.hasViewDemand(demand.id, user2.id)
      assert(hasView === true)

      hasViewRemind = await trace.view.hasViewDemandRemind(demand.id, user2.id)
      assert(hasViewRemind === true)


      // 标记已读
      await trace.view.readViewDemandRemind(user1.id)

      viewRemindCount = await trace.view.getViewDemandRemindCount(user1.id)
      assert(viewRemindCount === 1)

      viewUnreadRemindCount = await trace.view.getViewDemandUnreadRemindCount(user1.id)
      assert(viewUnreadRemindCount === 0)


      let errorCount = 0

      // 可以再次浏览
      try {
        await trace.view.viewDemand(demand.id)
      }
      catch (err) {
        errorCount++
      }

      assert(errorCount === 0)

      // 浏览量怎么累计是个问题
      // 这里 trace_view 表不会每次浏览都 insert
      // 因此他的数据总量是不会变的

      viewCount = await trace.view.getViewDemandCount(demand.id)
      assert(viewCount === 1)

      // 但是对于资源来说，计数器是需要累加的

      viewCount = await project.demand.getDemandViewCount(demand.id)
      assert(viewCount === 2)

    })


  })
})