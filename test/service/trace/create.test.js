
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

    it('create comment', async () => {

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


      let content = 'ahahahahahahahah'

      let commentId = await article.comment.createComment({
        post_id: post.id,
        content: content,
        anonymous: app.limit.ANONYMOUS_YES,
      })

      let hasCreateComment = await trace.create.hasCreateComment(commentId)
      assert(hasCreateComment === true)

      let createComment = await trace.create.getCreateComment(commentId)
      assert(app.util.type(createComment) === 'object')

      // 评论自己的文章不用提醒
      let hasCreateCommentRemind = await trace.create.hasCreateCommentRemind(commentId)
      assert(hasCreateCommentRemind === false)

      let createCommentCount = await trace.create.getCreateCommentCount(null, post.id)
      assert(createCommentCount === 1)

      createCommentCount = await trace.create.getCreateCommentCount(user1.id, post.id)
      assert(createCommentCount === 1)

      let createCommentList = await trace.create.getCreateCommentList(null, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 1)

      createCommentList = await trace.create.getCreateCommentList(user1.id, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 1)

      let createCommentRemindList = await trace.create.getCreateCommentRemindList(user1.id, { page: 0, page_size: 1000 })
      assert(createCommentRemindList.length === 0)

      let createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 0)

      let createCommentUnreadRemindCount = await trace.create.getCreateCommentUnreadRemindCount(user1.id)
      assert(createCommentUnreadRemindCount === 0)


      // 换 user2 来评论
      await userService.signout()

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      commentId = await article.comment.createComment({
        post_id: post.id,
        content: content,
        anonymous: app.limit.ANONYMOUS_YES,
      })



      hasCreateComment = await trace.create.hasCreateComment(commentId)
      assert(hasCreateComment === true)

      createComment = await trace.create.getCreateComment(commentId)
      assert(app.util.type(createComment) === 'object')

      hasCreateCommentRemind = await trace.create.hasCreateCommentRemind(commentId)
      assert(hasCreateCommentRemind === true)

      createCommentCount = await trace.create.getCreateCommentCount(null, post.id)
      assert(createCommentCount === 2)

      createCommentCount = await trace.create.getCreateCommentCount(user1.id, post.id)
      assert(createCommentCount === 1)

      createCommentCount = await trace.create.getCreateCommentCount(user2.id, post.id)
      assert(createCommentCount === 1)

      createCommentList = await trace.create.getCreateCommentList(null, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 2)

      createCommentList = await trace.create.getCreateCommentList(user1.id, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 1)

      createCommentList = await trace.create.getCreateCommentList(user2.id, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 1)

      createCommentRemindList = await trace.create.getCreateCommentRemindList(user1.id, { page: 0, page_size: 1000 })
      assert(createCommentRemindList.length === 1)

      createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 1)

      createCommentUnreadRemindCount = await trace.create.getCreateCommentUnreadRemindCount(user1.id)
      assert(createCommentUnreadRemindCount === 1)




      // 再评论一次
      commentId = await article.comment.createComment({
        post_id: post.id,
        content: content,
        anonymous: app.limit.ANONYMOUS_YES,
      })



      hasCreateComment = await trace.create.hasCreateComment(commentId)
      assert(hasCreateComment === true)

      createComment = await trace.create.getCreateComment(commentId)
      assert(app.util.type(createComment) === 'object')

      hasCreateCommentRemind = await trace.create.hasCreateCommentRemind(commentId)
      assert(hasCreateCommentRemind === true)

      createCommentCount = await trace.create.getCreateCommentCount(null, post.id)
      assert(createCommentCount === 3)

      createCommentCount = await trace.create.getCreateCommentCount(user1.id, post.id)
      assert(createCommentCount === 1)

      createCommentCount = await trace.create.getCreateCommentCount(user2.id, post.id)
      assert(createCommentCount === 2)

      createCommentList = await trace.create.getCreateCommentList(null, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 3)

      createCommentList = await trace.create.getCreateCommentList(user1.id, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 1)

      createCommentList = await trace.create.getCreateCommentList(user2.id, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 2)

      createCommentRemindList = await trace.create.getCreateCommentRemindList(user1.id, { page: 0, page_size: 1000 })
      assert(createCommentRemindList.length === 2)

      createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 2)

      createCommentUnreadRemindCount = await trace.create.getCreateCommentUnreadRemindCount(user1.id)
      assert(createCommentUnreadRemindCount === 2)


      // 删掉一个
      await article.comment.deleteComment(commentId)



      hasCreateComment = await trace.create.hasCreateComment(commentId)
      assert(hasCreateComment === false)

      createComment = await trace.create.getCreateComment(commentId)
      assert(createComment == null)

      hasCreateCommentRemind = await trace.create.hasCreateCommentRemind(commentId)
      assert(hasCreateCommentRemind === false)

      createCommentCount = await trace.create.getCreateCommentCount(null, post.id)
      assert(createCommentCount === 2)

      createCommentCount = await trace.create.getCreateCommentCount(user1.id, post.id)
      assert(createCommentCount === 1)

      createCommentCount = await trace.create.getCreateCommentCount(user2.id, post.id)
      assert(createCommentCount === 1)

      createCommentList = await trace.create.getCreateCommentList(null, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 2)

      createCommentList = await trace.create.getCreateCommentList(user1.id, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 1)

      createCommentList = await trace.create.getCreateCommentList(user2.id, post.id, { page: 0, page_size: 1000 })
      assert(createCommentList.length === 1)

      createCommentRemindList = await trace.create.getCreateCommentRemindList(user1.id, { page: 0, page_size: 1000 })
      assert(createCommentRemindList.length === 1)

      createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 1)

      createCommentUnreadRemindCount = await trace.create.getCreateCommentUnreadRemindCount(user1.id)
      assert(createCommentUnreadRemindCount === 1)



      // 标记已读
      await trace.create.readCreateCommentRemind(user1.id)

      createCommentRemindCount = await trace.create.getCreateCommentRemindCount(user1.id)
      assert(createCommentRemindCount === 1)

      createCommentUnreadRemindCount = await trace.create.getCreateCommentUnreadRemindCount(user1.id)
      assert(createCommentUnreadRemindCount === 0)

    })



    it('create demand', async () => {

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
        content: 'contentcontentcontentcontentcontentcontent',
      }

      demand.id = await project.demand.createDemand(demand)

      let createRecord = await trace.create.getCreateDemand(demand.id)

      let hasCreate = await trace.create.hasCreateDemand(demand.id)
      assert(hasCreate === true)


      await project.demand.deleteDemand(demand.id)

      hasCreate = await trace.create.hasCreateDemand(demand.id)
      assert(hasCreate === false)

      createRecord = await trace.create.getCreateDemand(demand.id)
      assert(createRecord == null)

    })

    it('create consult', async () => {

      const ctx = app.mockContext()
      const { account, project, trace } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }


      // user1 发表一篇项目
      currentUser = await account.user.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      let demand = {
        title: '123421123',
        content: 'contentcontentcontentcontentcontentcontent',
      }

      demand.id = await project.demand.createDemand(demand)


      let content = 'ahahahahahahahah'

      let consultId = await project.consult.createConsult({
        demand_id: demand.id,
        content: content,
      })

      let hasCreateConsult = await trace.create.hasCreateConsult(consultId)
      assert(hasCreateConsult === true)

      let createConsult = await trace.create.getCreateConsult(consultId)
      assert(app.util.type(createConsult) === 'object')

      // 咨询自己的项目不用提醒
      let hasCreateConsultRemind = await trace.create.hasCreateConsultRemind(consultId)
      assert(hasCreateConsultRemind === false)

      let createConsultCount = await trace.create.getCreateConsultCount(null, demand.id)
      assert(createConsultCount === 1)

      createConsultCount = await trace.create.getCreateConsultCount(user1.id, demand.id)
      assert(createConsultCount === 1)

      let createConsultList = await trace.create.getCreateConsultList(null, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 1)

      createConsultList = await trace.create.getCreateConsultList(user1.id, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 1)

      let createConsultRemindList = await trace.create.getCreateConsultRemindList(user1.id, { page: 0, page_size: 1000 })
      assert(createConsultRemindList.length === 0)

      let createConsultRemindCount = await trace.create.getCreateConsultRemindCount(user1.id)
      assert(createConsultRemindCount === 0)

      let createConsultUnreadRemindCount = await trace.create.getCreateConsultUnreadRemindCount(user1.id)
      assert(createConsultUnreadRemindCount === 0)


      // 换 user2 来咨询
      await userService.signout()

      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      consultId = await project.consult.createConsult({
        demand_id: demand.id,
        content: content,
      })



      hasCreateConsult = await trace.create.hasCreateConsult(consultId)
      assert(hasCreateConsult === true)

      createConsult = await trace.create.getCreateConsult(consultId)
      assert(app.util.type(createConsult) === 'object')

      hasCreateConsultRemind = await trace.create.hasCreateConsultRemind(consultId)
      assert(hasCreateConsultRemind === true)

      createConsultCount = await trace.create.getCreateConsultCount(null, demand.id)
      assert(createConsultCount === 2)

      createConsultCount = await trace.create.getCreateConsultCount(user1.id, demand.id)
      assert(createConsultCount === 1)

      createConsultCount = await trace.create.getCreateConsultCount(user2.id, demand.id)
      assert(createConsultCount === 1)

      createConsultList = await trace.create.getCreateConsultList(null, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 2)

      createConsultList = await trace.create.getCreateConsultList(user1.id, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 1)

      createConsultList = await trace.create.getCreateConsultList(user2.id, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 1)

      createConsultRemindList = await trace.create.getCreateConsultRemindList(user1.id, { page: 0, page_size: 1000 })
      assert(createConsultRemindList.length === 1)

      createConsultRemindCount = await trace.create.getCreateConsultRemindCount(user1.id)
      assert(createConsultRemindCount === 1)

      createConsultUnreadRemindCount = await trace.create.getCreateConsultUnreadRemindCount(user1.id)
      assert(createConsultUnreadRemindCount === 1)




      // 再咨询一次
      consultId = await project.consult.createConsult({
        demand_id: demand.id,
        content: content,
      })



      hasCreateConsult = await trace.create.hasCreateConsult(consultId)
      assert(hasCreateConsult === true)

      createConsult = await trace.create.getCreateConsult(consultId)
      assert(app.util.type(createConsult) === 'object')

      hasCreateConsultRemind = await trace.create.hasCreateConsultRemind(consultId)
      assert(hasCreateConsultRemind === true)

      createConsultCount = await trace.create.getCreateConsultCount(null, demand.id)
      assert(createConsultCount === 3)

      createConsultCount = await trace.create.getCreateConsultCount(user1.id, demand.id)
      assert(createConsultCount === 1)

      createConsultCount = await trace.create.getCreateConsultCount(user2.id, demand.id)
      assert(createConsultCount === 2)

      createConsultList = await trace.create.getCreateConsultList(null, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 3)

      createConsultList = await trace.create.getCreateConsultList(user1.id, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 1)

      createConsultList = await trace.create.getCreateConsultList(user2.id, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 2)

      createConsultRemindList = await trace.create.getCreateConsultRemindList(user1.id, { page: 0, page_size: 1000 })
      assert(createConsultRemindList.length === 2)

      createConsultRemindCount = await trace.create.getCreateConsultRemindCount(user1.id)
      assert(createConsultRemindCount === 2)

      createConsultUnreadRemindCount = await trace.create.getCreateConsultUnreadRemindCount(user1.id)
      assert(createConsultUnreadRemindCount === 2)


      // 删掉一个
      await project.consult.deleteConsult(consultId)



      hasCreateConsult = await trace.create.hasCreateConsult(consultId)
      assert(hasCreateConsult === false)

      createConsult = await trace.create.getCreateConsult(consultId)
      assert(createConsult == null)

      hasCreateConsultRemind = await trace.create.hasCreateConsultRemind(consultId)
      assert(hasCreateConsultRemind === false)

      createConsultCount = await trace.create.getCreateConsultCount(null, demand.id)
      assert(createConsultCount === 2)

      createConsultCount = await trace.create.getCreateConsultCount(user1.id, demand.id)
      assert(createConsultCount === 1)

      createConsultCount = await trace.create.getCreateConsultCount(user2.id, demand.id)
      assert(createConsultCount === 1)

      createConsultList = await trace.create.getCreateConsultList(null, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 2)

      createConsultList = await trace.create.getCreateConsultList(user1.id, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 1)

      createConsultList = await trace.create.getCreateConsultList(user2.id, demand.id, { page: 0, page_size: 1000 })
      assert(createConsultList.length === 1)

      createConsultRemindList = await trace.create.getCreateConsultRemindList(user1.id, { page: 0, page_size: 1000 })
      assert(createConsultRemindList.length === 1)

      createConsultRemindCount = await trace.create.getCreateConsultRemindCount(user1.id)
      assert(createConsultRemindCount === 1)

      createConsultUnreadRemindCount = await trace.create.getCreateConsultUnreadRemindCount(user1.id)
      assert(createConsultUnreadRemindCount === 1)



      // 标记已读
      await trace.create.readCreateConsultRemind(user1.id)

      createConsultRemindCount = await trace.create.getCreateConsultRemindCount(user1.id)
      assert(createConsultRemindCount === 1)

      createConsultUnreadRemindCount = await trace.create.getCreateConsultUnreadRemindCount(user1.id)
      assert(createConsultUnreadRemindCount === 0)

    })


  })
})