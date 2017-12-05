
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/trace/follow.test.js', () => {

  describe('follow service', () => {

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

    it('follow post', async () => {

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

      // user2 关注该文章

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      // 文章总关注数
      let followCount = await trace.follow.getFollowPostCount(null, post.id)
      assert(followCount === 0)

      followCount = await article.post.getPostFollowCount(post.id)
      assert(followCount === 0)

      // 作者收到提醒的数量
      let followRemindCount = await trace.follow.getFollowPostRemindCount(user1.id)
      assert(followRemindCount === 0)

      // 作者收到未读提醒的数量
      let followUnreadRemindCount = await trace.follow.getFollowPostUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 0)

      // user2 是否关注了 user1 的文章
      let hasFollow = await trace.follow.hasFollowPost(user2.id, post.id)
      assert(hasFollow === false)

      // user2 是否关注了 user1 的文章之后是否发送了提醒
      let hasFollowRemind = await trace.follow.hasFollowPostRemind(user2.id, post.id)
      assert(hasFollowRemind === false)



      await trace.follow.followPost(post.id)



      followCount = await trace.follow.getFollowPostCount(null, post.id)
      assert(followCount === 1)

      followCount = await article.post.getPostFollowCount(post.id)
      assert(followCount === 1)

      followRemindCount = await trace.follow.getFollowPostRemindCount(user1.id)
      assert(followRemindCount === 1)

      followUnreadRemindCount = await trace.follow.getFollowPostUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 1)

      hasFollow = await trace.follow.hasFollowPost(user2.id, post.id)
      assert(hasFollow === true)

      hasFollowRemind = await trace.follow.hasFollowPostRemind(user2.id, post.id)
      assert(hasFollowRemind === true)


      // 标记已读
      await trace.follow.readFollowPostRemind(user1.id)

      followRemindCount = await trace.follow.getFollowPostRemindCount(user1.id)
      assert(followRemindCount === 1)

      followUnreadRemindCount = await trace.follow.getFollowPostUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 0)


      let errorCount = 0

      // 不能再次关注
      try {
        await trace.follow.followPost(post.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_EXISTS)
        errorCount++
      }

      assert(errorCount === 1)



      await trace.follow.unfollowPost(post.id)

      followCount = await trace.follow.getFollowPostCount(null, post.id)
      assert(followCount === 0)

      followCount = await article.post.getPostFollowCount(post.id)
      assert(followCount === 0)

      followRemindCount = await trace.follow.getFollowPostRemindCount(user1.id)
      assert(followRemindCount === 0)

      followUnreadRemindCount = await trace.follow.getFollowPostUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 0)

      hasFollow = await trace.follow.hasFollowPost(user2.id, post.id)
      assert(hasFollow === false)

      hasFollowRemind = await trace.follow.hasFollowPostRemind(user2.id, post.id)
      assert(hasFollowRemind === false)



      // 不能再次取消关注
      try {
        await trace.follow.unfollowPost(post.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 2)




      await trace.follow.followPost(post.id)



      followCount = await trace.follow.getFollowPostCount(null, post.id)
      assert(followCount === 1)

      followCount = await article.post.getPostFollowCount(post.id)
      assert(followCount === 1)

      followRemindCount = await trace.follow.getFollowPostRemindCount(user1.id)
      assert(followRemindCount === 1)

      followUnreadRemindCount = await trace.follow.getFollowPostUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 1)

      hasFollow = await trace.follow.hasFollowPost(user2.id, post.id)
      assert(hasFollow === true)

      hasFollowRemind = await trace.follow.hasFollowPostRemind(user2.id, post.id)
      assert(hasFollowRemind === true)

    })




    it('follow demand', async () => {

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

      // user2 关注该项目

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      // 项目总关注数
      let followCount = await trace.follow.getFollowDemandCount(null, demand.id)
      assert(followCount === 0)

      followCount = await project.demand.getDemandFollowCount(demand.id)
      assert(followCount === 0)

      // 作者收到提醒的数量
      let followRemindCount = await trace.follow.getFollowDemandRemindCount(user1.id)
      assert(followRemindCount === 0)

      // 作者收到未读提醒的数量
      let followUnreadRemindCount = await trace.follow.getFollowDemandUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 0)

      // user2 是否关注了 user1 的项目
      let hasFollow = await trace.follow.hasFollowDemand(user2.id, demand.id)
      assert(hasFollow === false)

      // user2 是否关注了 user1 的项目之后是否发送了提醒
      let hasFollowRemind = await trace.follow.hasFollowDemandRemind(user2.id, demand.id)
      assert(hasFollowRemind === false)



      await trace.follow.followDemand(demand.id)



      followCount = await trace.follow.getFollowDemandCount(null, demand.id)
      assert(followCount === 1)

      followCount = await project.demand.getDemandFollowCount(demand.id)
      assert(followCount === 1)

      followRemindCount = await trace.follow.getFollowDemandRemindCount(user1.id)
      assert(followRemindCount === 1)

      followUnreadRemindCount = await trace.follow.getFollowDemandUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 1)

      hasFollow = await trace.follow.hasFollowDemand(user2.id, demand.id)
      assert(hasFollow === true)

      hasFollowRemind = await trace.follow.hasFollowDemandRemind(user2.id, demand.id)
      assert(hasFollowRemind === true)


      // 标记已读
      await trace.follow.readFollowDemandRemind(user1.id)

      followRemindCount = await trace.follow.getFollowDemandRemindCount(user1.id)
      assert(followRemindCount === 1)

      followUnreadRemindCount = await trace.follow.getFollowDemandUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 0)


      let errorCount = 0

      // 不能再次关注
      try {
        await trace.follow.followDemand(demand.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_EXISTS)
        errorCount++
      }

      assert(errorCount === 1)



      await trace.follow.unfollowDemand(demand.id)

      followCount = await trace.follow.getFollowDemandCount(null, demand.id)
      assert(followCount === 0)

      followCount = await project.demand.getDemandFollowCount(demand.id)
      assert(followCount === 0)

      followRemindCount = await trace.follow.getFollowDemandRemindCount(user1.id)
      assert(followRemindCount === 0)

      followUnreadRemindCount = await trace.follow.getFollowDemandUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 0)

      hasFollow = await trace.follow.hasFollowDemand(user2.id, demand.id)
      assert(hasFollow === false)

      hasFollowRemind = await trace.follow.hasFollowDemandRemind(user2.id, demand.id)
      assert(hasFollowRemind === false)



      // 不能再次取消关注
      try {
        await trace.follow.unfollowDemand(demand.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 2)




      await trace.follow.followDemand(demand.id)



      followCount = await trace.follow.getFollowDemandCount(null, demand.id)
      assert(followCount === 1)

      followCount = await project.demand.getDemandFollowCount(demand.id)
      assert(followCount === 1)

      followRemindCount = await trace.follow.getFollowDemandRemindCount(user1.id)
      assert(followRemindCount === 1)

      followUnreadRemindCount = await trace.follow.getFollowDemandUnreadRemindCount(user1.id)
      assert(followUnreadRemindCount === 1)

      hasFollow = await trace.follow.hasFollowDemand(user2.id, demand.id)
      assert(hasFollow === true)

      hasFollowRemind = await trace.follow.hasFollowDemandRemind(user2.id, demand.id)
      assert(hasFollowRemind === true)

    })

  })
})