
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/trace/like.test.js', () => {

  describe('like service', () => {

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

    it('like post', async () => {

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


      let userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 0)

      await account.user.signout()

      // user2 点赞该文章

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      // 文章总点赞数
      let likeCount = await trace.like.getLikePostCount(post.id)
      assert(likeCount === 0)

      likeCount = await article.post.getPostLikeCount(post.id)
      assert(likeCount === 0)

      // 作者收到提醒的数量
      let likeRemindCount = await trace.like.getLikePostRemindCount(user1.id)
      assert(likeRemindCount === 0)

      // 作者收到未读提醒的数量
      let likeUnreadRemindCount = await trace.like.getLikePostUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 0)

      // user2 是否点赞了 user1 的文章
      let hasLike = await trace.like.hasLikePost(post.id, user2.id)
      assert(hasLike === false)

      // user2 是否点赞了 user1 的文章之后是否发送了提醒
      let hasLikeRemind = await trace.like.hasLikePostRemind(post.id, user2.id)
      assert(hasLikeRemind === false)



      await trace.like.likePost(post.id)

      userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 1)

      likeCount = await trace.like.getLikePostCount(post.id)
      assert(likeCount === 1)

      likeCount = await article.post.getPostLikeCount(post.id)
      assert(likeCount === 1)

      likeRemindCount = await trace.like.getLikePostRemindCount(user1.id)
      assert(likeRemindCount === 1)

      likeUnreadRemindCount = await trace.like.getLikePostUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 1)

      hasLike = await trace.like.hasLikePost(post.id, user2.id)
      assert(hasLike === true)

      hasLikeRemind = await trace.like.hasLikePostRemind(post.id, user2.id)
      assert(hasLikeRemind === true)


      // 标记已读
      await trace.like.readLikePostRemind(user1.id)

      likeRemindCount = await trace.like.getLikePostRemindCount(user1.id)
      assert(likeRemindCount === 1)

      likeUnreadRemindCount = await trace.like.getLikePostUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 0)


      let errorCount = 0

      // 不能再次点赞
      try {
        await trace.like.likePost(post.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_EXISTS)
        errorCount++
      }

      assert(errorCount === 1)



      await trace.like.unlikePost(post.id)

      userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 0)

      likeCount = await trace.like.getLikePostCount(post.id)
      assert(likeCount === 0)

      likeCount = await article.post.getPostLikeCount(post.id)
      assert(likeCount === 0)

      likeRemindCount = await trace.like.getLikePostRemindCount(user1.id)
      assert(likeRemindCount === 0)

      likeUnreadRemindCount = await trace.like.getLikePostUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 0)

      hasLike = await trace.like.hasLikePost(post.id, user2.id)
      assert(hasLike === false)

      hasLikeRemind = await trace.like.hasLikePostRemind(post.id, user2.id)
      assert(hasLikeRemind === false)



      // 不能再次取消关注
      try {
        await trace.like.unlikePost(post.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 2)




      await trace.like.likePost(post.id)



      userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 1)

      likeCount = await trace.like.getLikePostCount(post.id)
      assert(likeCount === 1)

      likeCount = await article.post.getPostLikeCount(post.id)
      assert(likeCount === 1)

      likeRemindCount = await trace.like.getLikePostRemindCount(user1.id)
      assert(likeRemindCount === 1)

      likeUnreadRemindCount = await trace.like.getLikePostUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 1)

      hasLike = await trace.like.hasLikePost(post.id, user2.id)
      assert(hasLike === true)

      hasLikeRemind = await trace.like.hasLikePostRemind(post.id, user2.id)
      assert(hasLikeRemind === true)

      await trace.like.unlikePost(post.id)

    })





    it('like demand', async () => {

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


      let userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 0)

      await account.user.signout()

      // user2 点赞该项目

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      // 项目总点赞数
      let likeCount = await trace.like.getLikeDemandCount(demand.id)
      assert(likeCount === 0)

      likeCount = await project.demand.getDemandLikeCount(demand.id)
      assert(likeCount === 0)

      // 作者收到提醒的数量
      let likeRemindCount = await trace.like.getLikeDemandRemindCount(user1.id)
      assert(likeRemindCount === 0)

      // 作者收到未读提醒的数量
      let likeUnreadRemindCount = await trace.like.getLikeDemandUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 0)

      // user2 是否点赞了 user1 的项目
      let hasLike = await trace.like.hasLikeDemand(demand.id, user2.id)
      assert(hasLike === false)

      // user2 是否点赞了 user1 的项目之后是否发送了提醒
      let hasLikeRemind = await trace.like.hasLikeDemandRemind(demand.id, user2.id)
      assert(hasLikeRemind === false)



      await trace.like.likeDemand(demand.id)



      userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 1)

      likeCount = await trace.like.getLikeDemandCount(demand.id)
      assert(likeCount === 1)

      likeCount = await project.demand.getDemandLikeCount(demand.id)
      assert(likeCount === 1)

      likeRemindCount = await trace.like.getLikeDemandRemindCount(user1.id)
      assert(likeRemindCount === 1)

      likeUnreadRemindCount = await trace.like.getLikeDemandUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 1)

      hasLike = await trace.like.hasLikeDemand(demand.id, user2.id)
      assert(hasLike === true)

      hasLikeRemind = await trace.like.hasLikeDemandRemind(demand.id, user2.id)
      assert(hasLikeRemind === true)


      // 标记已读
      await trace.like.readLikeDemandRemind(user1.id)

      likeRemindCount = await trace.like.getLikeDemandRemindCount(user1.id)
      assert(likeRemindCount === 1)

      likeUnreadRemindCount = await trace.like.getLikeDemandUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 0)


      let errorCount = 0

      // 不能再次点赞
      try {
        await trace.like.likeDemand(demand.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_EXISTS)
        errorCount++
      }

      assert(errorCount === 1)



      await trace.like.unlikeDemand(demand.id)


      userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 0)

      likeCount = await trace.like.getLikeDemandCount(demand.id)
      assert(likeCount === 0)

      likeCount = await project.demand.getDemandLikeCount(demand.id)
      assert(likeCount === 0)

      likeRemindCount = await trace.like.getLikeDemandRemindCount(user1.id)
      assert(likeRemindCount === 0)

      likeUnreadRemindCount = await trace.like.getLikeDemandUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 0)

      hasLike = await trace.like.hasLikeDemand(demand.id, user2.id)
      assert(hasLike === false)

      hasLikeRemind = await trace.like.hasLikeDemandRemind(demand.id, user2.id)
      assert(hasLikeRemind === false)



      // 不能再次取消关注
      try {
        await trace.like.unlikeDemand(demand.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 2)




      await trace.like.likeDemand(demand.id)



      userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 1)

      likeCount = await trace.like.getLikeDemandCount(demand.id)
      assert(likeCount === 1)

      likeCount = await project.demand.getDemandLikeCount(demand.id)
      assert(likeCount === 1)

      likeRemindCount = await trace.like.getLikeDemandRemindCount(user1.id)
      assert(likeRemindCount === 1)

      likeUnreadRemindCount = await trace.like.getLikeDemandUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 1)

      hasLike = await trace.like.hasLikeDemand(demand.id, user2.id)
      assert(hasLike === true)

      hasLikeRemind = await trace.like.hasLikeDemandRemind(demand.id, user2.id)
      assert(hasLikeRemind === true)

      await trace.like.unlikeDemand(demand.id)

    })





    it('like question', async () => {

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


      let userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 0)

      await account.user.signout()

      // user2 点赞该问题

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      // 问题总点赞数
      let likeCount = await trace.like.getLikeQuestionCount(question.id)
      assert(likeCount === 0)

      likeCount = await qa.question.getQuestionLikeCount(question.id)
      assert(likeCount === 0)

      // 作者收到提醒的数量
      let likeRemindCount = await trace.like.getLikeQuestionRemindCount(user1.id)
      assert(likeRemindCount === 0)

      // 作者收到未读提醒的数量
      let likeUnreadRemindCount = await trace.like.getLikeQuestionUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 0)

      // user2 是否点赞了 user1 的问题
      let hasLike = await trace.like.hasLikeQuestion(question.id, user2.id)
      assert(hasLike === false)

      // user2 是否点赞了 user1 的问题之后是否发送了提醒
      let hasLikeRemind = await trace.like.hasLikeQuestionRemind(question.id, user2.id)
      assert(hasLikeRemind === false)



      await trace.like.likeQuestion(question.id)



      userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 1)

      likeCount = await trace.like.getLikeQuestionCount(question.id)
      assert(likeCount === 1)

      likeCount = await qa.question.getQuestionLikeCount(question.id)
      assert(likeCount === 1)

      likeRemindCount = await trace.like.getLikeQuestionRemindCount(user1.id)
      assert(likeRemindCount === 1)

      likeUnreadRemindCount = await trace.like.getLikeQuestionUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 1)

      hasLike = await trace.like.hasLikeQuestion(question.id, user2.id)
      assert(hasLike === true)

      hasLikeRemind = await trace.like.hasLikeQuestionRemind(question.id, user2.id)
      assert(hasLikeRemind === true)


      // 标记已读
      await trace.like.readLikeQuestionRemind(user1.id)

      likeRemindCount = await trace.like.getLikeQuestionRemindCount(user1.id)
      assert(likeRemindCount === 1)

      likeUnreadRemindCount = await trace.like.getLikeQuestionUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 0)


      let errorCount = 0

      // 不能再次点赞
      try {
        await trace.like.likeQuestion(question.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_EXISTS)
        errorCount++
      }

      assert(errorCount === 1)



      await trace.like.unlikeQuestion(question.id)


      userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 0)

      likeCount = await trace.like.getLikeQuestionCount(question.id)
      assert(likeCount === 0)

      likeCount = await qa.question.getQuestionLikeCount(question.id)
      assert(likeCount === 0)

      likeRemindCount = await trace.like.getLikeQuestionRemindCount(user1.id)
      assert(likeRemindCount === 0)

      likeUnreadRemindCount = await trace.like.getLikeQuestionUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 0)

      hasLike = await trace.like.hasLikeQuestion(question.id, user2.id)
      assert(hasLike === false)

      hasLikeRemind = await trace.like.hasLikeQuestionRemind(question.id, user2.id)
      assert(hasLikeRemind === false)



      // 不能再次取消关注
      try {
        await trace.like.unlikeQuestion(question.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 2)




      await trace.like.likeQuestion(question.id)



      userLikeCount = await account.user.getUserLikeCount(user1.id)
      assert(userLikeCount === 1)

      likeCount = await trace.like.getLikeQuestionCount(question.id)
      assert(likeCount === 1)

      likeCount = await qa.question.getQuestionLikeCount(question.id)
      assert(likeCount === 1)

      likeRemindCount = await trace.like.getLikeQuestionRemindCount(user1.id)
      assert(likeRemindCount === 1)

      likeUnreadRemindCount = await trace.like.getLikeQuestionUnreadRemindCount(user1.id)
      assert(likeUnreadRemindCount === 1)

      hasLike = await trace.like.hasLikeQuestion(question.id, user2.id)
      assert(hasLike === true)

      hasLikeRemind = await trace.like.hasLikeQuestionRemind(question.id, user2.id)
      assert(hasLikeRemind === true)

      await trace.like.unlikeQuestion(question.id)

    })


  })
})