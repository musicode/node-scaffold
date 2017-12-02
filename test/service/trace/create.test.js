
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/trace/create.test.js', () => {

  describe('create service', () => {

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

    it('create post', async () => {

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
        content: 'contentcontentcontentcontentcontentcontent',
        anonymous: app.limit.ANONYMOUS_NO
      }

      post.id = await article.post.createPost(post)

      let createRecord = await trace.create.getCreatePost(post.id)
      assert(createRecord.anonymous === post.anonymous)

      let hasCreate = await trace.create.hasCreatePost(post.id)
      assert(hasCreate === true)

      await article.post.updatePostById(
        {
          anonymous: app.limit.ANONYMOUS_YES
        },
        post.id
      )

      createRecord = await trace.create.getCreatePost(post.id)
      assert(createRecord.anonymous === app.limit.ANONYMOUS_YES)


      await article.post.deletePost(post.id)

      hasCreate = await trace.create.hasCreatePost(post.id)
      assert(hasCreate === false)

      createRecord = await trace.create.getCreatePost(post.id)
      assert(createRecord == null)

    })


  })
})