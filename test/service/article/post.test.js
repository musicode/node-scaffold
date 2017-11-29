
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/article/post.test.js', () => {

  describe('post service', () => {

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

    it('post crud', async () => {

      const ctx = app.mockContext()
      const { account, article, trace } = ctx.service
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

      // 参数必须要有 title/content
      try {
        await article.post.createPost({
          title,
          anonymous,
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
        errorCount++
      }

      assert(errorCount === 1)

      try {
        await article.post.createPost({
          content,
          anonymous,
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
        errorCount++
      }

      assert(errorCount === 2)

      // 发表文章必须登录
      try {
        await article.post.createPost({
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

      let postId = await article.post.createPost({
        title,
        content,
        anonymous,
      })

      assert(app.util.type(postId) === 'number')

      let post = await article.post.getPostById(postId)
      assert(app.util.type(post) === 'object')

      assert(post.title === title)
      assert(post.content === content)
      assert(post.anonymous === anonymous)

      let newTitle = 'newtitle'
      let newContent = '213123213213123213213123213213123213213123213'

      try {
        await article.post.updatePostById({ title: newTitle, content: newContent }, '123')
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 4)

      await article.post.updatePostById({ title: newTitle, content: newContent }, postId)

      post = await article.post.getPostById(postId)
      assert(app.util.type(post) === 'object')

      assert(post.title === newTitle)
      assert(post.content === newContent)
      assert(post.anonymous === anonymous)


      await article.post.deletePost(postId)

      post = await article.post.getPostById(postId)
      assert(app.util.type(post) === 'object')

      try {
        await article.post.checkPostAvailable(postId)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 5)

    })


  })
})