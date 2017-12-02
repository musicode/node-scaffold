
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

      // 参数必须要有 content
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

      // 参数必须要有 title
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

      // 创作数量
      let writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      // 文章数量
      let postCount = await article.post.getPostCount({
        user_id: currentUser.id,
      })
      assert(postCount === 0)

      let postList = await article.post.getPostList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(postList.length === 0)

      let postId = await article.post.createPost({
        title,
        content,
        anonymous,
      })

      assert(app.util.type(postId) === 'number')

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 1)

      postCount = await article.post.getPostCount({
        user_id: currentUser.id,
      })
      assert(postCount === 1)

      postList = await article.post.getPostList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(postList.length === 1)


      let post = await article.post.getPostById(postId)
      assert(app.util.type(post) === 'object')
      assert(post.id === postId)
      assert(post.content === undefined)

      post = await article.post.getPostById(post)
      assert(app.util.type(post) === 'object')
      assert(post.id === postId)
      assert(post.content === undefined)

      post = await article.post.checkPostAvailableById(postId)
      assert(app.util.type(post) === 'object')
      assert(post.id === postId)
      assert(post.content === undefined)

      post = await article.post.checkPostAvailableById(post)
      assert(app.util.type(post) === 'object')
      assert(post.id === postId)
      assert(post.content === undefined)

      assert(post.title === title)
      assert(post.anonymous === anonymous)

      post = await article.post.getFullPostById(post)
      assert(app.util.type(post) === 'object')
      assert(post.content === content)
      assert(post.create_time.getTime() === post.update_time.getTime())



      // 修改文章
      let newTitle = 'newtitle'
      let newContent = '213123213213123213213123213213123213213123213'

      await new Promise(resolve => {

        setTimeout(
          async () => {

            await article.post.updatePostById({ title: newTitle, content: newContent }, postId)

            post = await article.post.getPostById(postId)
            assert(app.util.type(post) === 'object')

            assert(post.title === newTitle)
            assert(post.content === undefined)
            assert(post.anonymous === anonymous)

            const createTime = post.create_time
            const updateTime = post.update_time

            assert(createTime.getTime() < updateTime.getTime())


            setTimeout(
              async () => {

                let content = '123haha'
                await article.post.updatePostById({ content }, postId)

                post = await article.post.getFullPostById(postId)
                assert(post.content === content)
                assert(updateTime.getTime() < post.update_time.getTime())

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

      // 支持 post 对象，节省一次查询
      await article.post.updatePostById({ title: newTitle, content: newContent }, post)

      post = await article.post.getPostById(postId)
      assert(app.util.type(post) === 'object')

      assert(post.title === newTitle)
      assert(post.content === undefined)
      assert(post.anonymous === anonymous)





      await article.post.deletePost(postId)

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      postCount = await article.post.getPostCount({
        user_id: currentUser.id,
      })
      assert(postCount === 0)

      postList = await article.post.getPostList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(postList.length === 0)


      post = await article.post.checkPostAvailableById(postId)
      assert(app.util.type(post) === 'object')

      try {
        await article.post.checkPostAvailableById(postId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 4)


      postId = await article.post.createPost({
        title,
        content,
        anonymous,
      })

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 1)

      postCount = await article.post.getPostCount({
        user_id: currentUser.id,
      })
      assert(postCount === 1)

      postList = await article.post.getPostList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(postList.length === 1)

      post = await article.post.checkPostAvailableById(postId)
      assert(app.util.type(post) === 'object')


      // 支持 post 对象删除，节省一次查询
      await article.post.deletePost(post)

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      postCount = await article.post.getPostCount({
        user_id: currentUser.id,
      })
      assert(postCount === 0)

      postList = await article.post.getPostList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(postList.length === 0)

      try {
        await article.post.checkPostAvailableById(postId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 5)


    })


  })
})