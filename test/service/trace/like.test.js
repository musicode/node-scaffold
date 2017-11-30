
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/trace/like.test.js', () => {

  describe('blacklist service', () => {

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


      await account.user.signout()

      // user2 点赞该文章

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      let likeCount = await trace.like.getLikePostCount(post.id)
      assert(likeCount === 0)

      await trace.like.likePost(post.id)

      likeCount = await trace.like.getLikePostCount(post.id)
      assert(likeCount === 1)

      let errorCount = 0

      // 不能再次关注
      try {
        await trace.like.likePost(post.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_EXISTS)
        errorCount++
      }

      assert(errorCount === 1)

      let hasLike = await trace.like.hasLikePost(user2.id, post.id)
      assert(hasLike === true)

      let hasLikeRemind = await trace.like.hasLikePostRemind(user2.id, post.id)
      assert(hasLikeRemind === true)



      await trace.like.unlikePost(post.id)

      likeCount = await trace.like.getLikePostCount(post.id)
      assert(likeCount === 0)

      // 不能再次取消关注
      try {
        await trace.like.unlikePost(post.id)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 2)

      hasLike = await trace.like.hasLikePost(user2.id, post.id)
      assert(hasLike === false)

      hasLikeRemind = await trace.like.hasLikePostRemind(user2.id, post.id)
      assert(hasLikeRemind === false)

      likeCount = await trace.like.getLikePostCount(post.id)
      assert(likeCount === 0)

      await trace.like.likePost(post.id)

      likeCount = await trace.like.getLikePostCount(post.id)
      assert(likeCount === 1)

      hasLike = await trace.like.hasLikePost(user2.id, post.id)
      assert(hasLike === true)

      hasLikeRemind = await trace.like.hasLikePostRemind(user2.id, post.id)
      assert(hasLikeRemind === true)

    })


  })
})