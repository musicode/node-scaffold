
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/article/comment.test.js', () => {

  describe('comment service', () => {

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

    it('comment crud', async () => {

      const ctx = app.mockContext()
      const { account, article, trace } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      // user1 发表文章
      currentUser = await account.user.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      let errorCount = 0

      let title = '123456789'
      let content = 'hahahahahahahahahahhaahhahahahahahahahahahahahahahahhaahhahahahaha'
      let anonymous = app.limit.ANONYMOUS_YES

      let postId = await article.post.createPost({
        title,
        content,
        anonymous,
      })

      // 创作数量
      let writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 1)

      // 评论数量
      let commentCount = await article.comment.getCommentCount({
        post_id: postId,
      })
      assert(commentCount === 0)

      // 评论列表
      let commentList = await article.comment.getCommentList(
        {
          post_id: postId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(commentList.length === 0)


      // 作者自己发表评论
      let commentId = await article.comment.createComment({
        post_id: postId,
        content,
        anonymous,
      })

      // 评论不参与计数
      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 1)

      commentCount = await article.comment.getCommentCount({
        post_id: postId,
      })
      assert(commentCount === 1)

      commentList = await article.comment.getCommentList(
        {
          post_id: postId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(commentList.length === 1)




      // 各种获取评论
      let comment = await article.comment.getCommentById(commentId)
      assert(app.util.type(comment) === 'object')
      assert(comment.id === commentId)
      assert(comment.content === undefined)

      comment = await article.comment.getCommentById(comment)
      assert(app.util.type(comment) === 'object')
      assert(comment.id === commentId)
      assert(comment.content === undefined)

      comment = await article.comment.checkCommentAvailableById(commentId)
      assert(app.util.type(comment) === 'object')
      assert(comment.id === commentId)
      assert(comment.content === undefined)

      comment = await article.comment.checkCommentAvailableById(comment)
      assert(app.util.type(comment) === 'object')
      assert(comment.id === commentId)
      assert(comment.content === undefined)

      assert(comment.anonymous === anonymous)

      comment = await article.comment.getFullCommentById(comment)
      assert(app.util.type(comment) === 'object')
      assert(comment.content === content)
      assert(comment.create_time.getTime() === comment.update_time.getTime())


      // 修改评论
      let newContent = '213123213213123213213123213213123213213123213'

      await new Promise(resolve => {

        setTimeout(
          async () => {

            await article.comment.updateCommentById({ content: newContent }, commentId)

            comment = await article.comment.getCommentById(commentId)
            assert(app.util.type(comment) === 'object')
            assert(comment.content === undefined)
            assert(comment.anonymous === anonymous)

            assert(comment.create_time.getTime() === comment.update_time.getTime())

            comment = await article.comment.getFullCommentById(commentId)
            assert(comment.content === newContent)
            assert(comment.create_time.getTime() < comment.update_time.getTime())

            resolve()
          },
          1000
        )
      })


      newContent = 'aaa213123213213123213213123213213123213213123213123'

      // 支持 comment 对象，节省一次查询
      await article.comment.updateCommentById({ content: newContent }, comment)

      comment = await article.comment.getCommentById(commentId)
      assert(app.util.type(comment) === 'object')
      assert(comment.content === undefined)
      assert(comment.anonymous === anonymous)

      comment = await article.comment.getFullCommentById(commentId)
      assert(comment.content === newContent)



      let parentId = commentId
      // 评论评论
      commentId = await article.comment.createComment({
        post_id: postId,
        parent_id: parentId,
        content,
        anonymous,
      })

      assert(app.util.type(commentId) === 'number')

      commentCount = await article.comment.getCommentCount({
        post_id: postId,
      })
      assert(commentCount === 2)

      let subCount = await article.post.getPostSubCount(postId)
      assert(commentCount === 2)

      commentCount = await article.comment.getCommentCount({
        parent_id: parentId,
      })
      assert(commentCount === 1)

      subCount = await article.comment.getCommentSubCount(postId)
      assert(commentCount === 1)


      try {
        await article.post.deletePost(postId)
      }
      catch (err) {
        assert(err.code === app.code.PERMISSION_DENIED)
        errorCount++
      }
      assert(errorCount === 1)


      try {
        await article.comment.deleteComment(parentId)
      }
      catch (err) {
        assert(err.code === app.code.PERMISSION_DENIED)
        errorCount++
      }
      assert(errorCount === 2)


      await article.comment.deleteComment(commentId)


      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 1)

      commentCount = await article.comment.getCommentCount({
        post_id: postId,
      })
      assert(commentCount === 1)

      commentList = await article.comment.getCommentList(
        {
          post_id: postId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(commentList.length === 1)


      comment = await article.comment.checkCommentAvailableById(commentId)
      assert(app.util.type(comment) === 'object')

      try {
        await article.comment.checkCommentAvailableById(commentId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }
      assert(errorCount === 3)





      await article.comment.deleteComment(parentId)


      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 1)

      commentCount = await article.comment.getCommentCount({
        post_id: postId,
      })
      assert(commentCount === 0)

      commentList = await article.comment.getCommentList(
        {
          post_id: postId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(commentList.length === 0)



      await article.post.deletePost(postId)


    })


  })
})