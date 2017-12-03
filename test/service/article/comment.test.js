
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

      let hasCreateComment = await trace.create.hasCreateComment(commentId)
      assert(hasCreateComment === true)

      let createCommentCount = await trace.create.getCreateCommentCount(null, postId)
      assert(createCommentCount === 1)

      let createCommentList = await trace.create.getCreateCommentList(null, postId, {
        page: 0,
        page_size: 1000,
      })
      assert(createCommentList.length === 1)

      // 自己评论自己不用提醒
      let hasCreateCommentRemind = await trace.create.hasCreateCommentRemind(currentUser.id, commentId)
      assert(hasCreateCommentRemind === false)

      let createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 0)

      let createCommentRemindList = await trace.create.getCreateCommentRemindList(user1.id, {
        page: 0,
        page_size: 1000,
      })
      assert(createCommentRemindList.length === 0)

      let createCommentUnreadRemindCount = await trace.create.getCreateCommentUnreadRemindCount(user1.id)
      assert(createCommentUnreadRemindCount === 0)

      await account.user.signout()


      // user2 登录
      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })



      commentId = await article.comment.createComment({
        post_id: postId,
        content,
        anonymous,
      })







      commentCount = await article.comment.getCommentCount({
        post_id: postId,
      })
      assert(commentCount === 2)

      commentList = await article.comment.getCommentList(
        {
          post_id: postId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(commentList.length === 2)

      hasCreateComment = await trace.create.hasCreateComment(commentId)
      assert(hasCreateComment === true)

      createCommentCount = await trace.create.getCreateCommentCount(null, postId)
      assert(createCommentCount === 2)

      createCommentList = await trace.create.getCreateCommentList(null, postId, {
        page: 0,
        page_size: 1000,
      })
      assert(createCommentList.length === 2)

      hasCreateCommentRemind = await trace.create.hasCreateCommentRemind(currentUser.id, commentId)
      assert(hasCreateCommentRemind === true)

      createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 1)

      createCommentRemindList = await trace.create.getCreateCommentRemindList(user1.id, {
        page: 0,
        page_size: 1000,
      })
      assert(createCommentRemindList.length === 1)

      createCommentUnreadRemindCount = await trace.create.getCreateCommentUnreadRemindCount(user1.id)
      assert(createCommentUnreadRemindCount === 1)




      // 再来一条评论

      commentId = await article.comment.createComment({
        post_id: postId,
        content,
        anonymous,
      })



      commentCount = await article.comment.getCommentCount({
        post_id: postId,
      })
      assert(commentCount === 3)

      commentList = await article.comment.getCommentList(
        {
          post_id: postId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(commentList.length === 3)

      hasCreateComment = await trace.create.hasCreateComment(commentId)
      assert(hasCreateComment === true)

      createCommentCount = await trace.create.getCreateCommentCount(null, postId)
      assert(createCommentCount === 3)

      createCommentList = await trace.create.getCreateCommentList(null, postId, {
        page: 0,
        page_size: 1000,
      })
      assert(createCommentList.length === 3)

      hasCreateCommentRemind = await trace.create.hasCreateCommentRemind(currentUser.id, commentId)
      assert(hasCreateCommentRemind === true)

      createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 2)

      createCommentRemindList = await trace.create.getCreateCommentRemindList(user1.id, {
        page: 0,
        page_size: 1000,
      })
      assert(createCommentRemindList.length === 2)

      createCommentUnreadRemindCount = await trace.create.getCreateCommentUnreadRemindCount(user1.id)
      assert(createCommentUnreadRemindCount === 2)



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
            return

            comment = await article.comment.getCommentById(commentId)
            assert(app.util.type(comment) === 'object')

            assert(comment.content === undefined)
            assert(comment.anonymous === anonymous)

            const createTime = comment.create_time
            const updateTime = comment.update_time

            // assert(createTime.getTime() < updateTime.getTime())

          },
          1000
        )
      })
      return


      newContent = '213123213213123213213123213213123213213123213123'

      // 支持 comment 对象，节省一次查询
      await article.comment.updateCommentById({ content: newContent }, comment)

      comment = await article.comment.getCommentById(commentId)
      assert(app.util.type(comment) === 'object')

      assert(comment.content === undefined)
      assert(comment.anonymous === anonymous)



      // use1 标记已读
      await userService.signout()

      currentUser = await account.user.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      await trace.create.readCreateCommentRemind(user1.id)


      createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 2)

      createCommentUnreadRemindCount = await trace.create.getCreateCommentUnreadRemindCount(user1.id)
      assert(createCommentUnreadRemindCount === 0)



      // 当前不是 user2
      try {
        await article.comment.deleteComment(commentId)
      }
      catch (err) {
        assert(err.code === app.code.PERMISSION_DENIED)
        errorCount++
      }

      assert(errorCount === 1)


      await userService.signout()

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      await article.comment.deleteComment(commentId)





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

      hasCreateComment = await trace.create.hasCreateComment(commentId)
      assert(hasCreateComment === false)

      createCommentCount = await trace.create.getCreateCommentCount(null, postId)
      assert(createCommentCount === 1)

      createCommentList = await trace.create.getCreateCommentList(null, postId, {
        page: 0,
        page_size: 1000,
      })
      assert(createCommentList.length === 1)

      hasCreateCommentRemind = await trace.create.hasCreateCommentRemind(currentUser.id, commentId)
      assert(hasCreateCommentRemind === false)

      createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 1)

      createCommentRemindList = await trace.create.getCreateCommentRemindList(user1.id, {
        page: 0,
        page_size: 1000,
      })
      assert(createCommentRemindList.length === 1)





      comment = await article.comment.checkCommentAvailableById(commentId)
      assert(app.util.type(comment) === 'object')

      try {
        await article.comment.checkCommentAvailableById(commentId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 2)






    })


  })
})