'use strict'

module.exports = app => {

  const { util, limit } = app

  class QuestionController extends app.BaseController {

    async checkQuestion() {

      const input = this.filter(this.input, {
        question_id: 'trim',
      })

      this.validate(input, {
        question_id: 'string',
      })

      const { qa } = this.ctx.service

      return await qa.question.checkQuestionAvailableByNumber(input.question_id, true)

    }

    async detail() {

      let question = await this.checkQuestion()

      const { qa } = this.ctx.service

      question = await qa.question.viewQuestion(question)

      this.output.question = await qa.question.toExternal(question)

    }

    async view() {

      const question = await this.checkQuestion()

      const { trace } = this.ctx.service

      trace.view.viewQuestion(question.id)

    }

    async list() {

      const input = this.filter(this.input, {
        user_id: 'number',
        status: 'number',
        content_max_length: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        user_id: {
          required: false,
          type: 'number'
        },
        status: {
          required: false,
          type: 'number'
        },
        content_max_length: {
          required: false,
          type: 'number'
        },
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { account, qa } = this.ctx.service
      const currentUser = await account.session.getCurrentUser()

      const where = { }
      let anonymousVisible = true

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        where.user_id = user.id

        if (!currentUser || currentUser.id !== user.id) {
          anonymousVisible = false
        }
      }

      if (util.type(input.status) === 'number') {
        where.status = input.status
      }

      if (!anonymousVisible) {
        where.anonymous = limit.ANONYMOUS_NO
      }

      const options = {
        page: input.page,
        page_size: input.page_size,
        sort_order: input.sort_order || 'desc',
        sort_by: input.sort_by || 'create_time'
      }
      const list = await qa.question.getQuestionList(where, options)
      const count = await qa.question.getQuestionCount(where)

      await util.each(
        list,
        async (item, index) => {
          item = await qa.question.toExternal(item)
          if (input.content_max_length > 0) {
            item.content = util.renderSummary(item.content, input.content_max_length)
          }
          list[ index ] = item
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async create() {

      const input = this.filter(this.input, {
        title: 'trim',
        content: 'trim',
        anonymous: 'number',
      })

      this.validate(input, {
        title: 'question_title',
        content: 'question_content',
        anonymous: 'anonymous',
      })

      const questionService = this.ctx.service.qa.question

      const questionId = await questionService.createQuestion(input)
      const question = await questionService.getFullQuestionById(questionId)

      this.output.question = await questionService.toExternal(question)

    }

    async update() {

      const input = this.filter(this.input, {
        question_id: 'trim',
        title: 'trim',
        content: 'trim',
        anonymous: 'number',
      })

      this.validate(input, {
        question_id: 'string',
        title: 'question_title',
        content: 'question_content',
        anonymous: 'anonymous',
      })

      const questionService = this.ctx.service.qa.question

      const question = await questionService.checkQuestionAvailableByNumber(input.question_id)

      await questionService.updateQuestionById(input, question)

    }

    async delete() {

      const question = await this.checkQuestion()

      const { qa } = this.ctx.service

      await qa.question.deleteQuestion(question)

    }

    async follow() {

      const question = await this.checkQuestion()

      const { trace } = this.ctx.service

      await trace.follow.followQuestion(question)

    }

    async unfollow() {

      const question = await this.checkQuestion()

      const { trace } = this.ctx.service

~     await trace.follow.unfollowQuestion(question)

    }

    async getFollowCount() {

      const question = await this.checkQuestion()

      const { qa } = this.ctx.service

      this.output.count = await qa.question.getQuestionFollowCount(question.id)

    }

    async getFollowList() {

      const input = this.filter(this.input, {
        question_id: 'number',
        user_id: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        question_id: {
          required: false,
          type: 'number'
        },
        user_id: {
          required: false,
          type: 'number'
        },
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order',
        },
      })

      const { account, qa, trace } = this.ctx.service

      let questionId, userId

      if (input.question_id) {
        const question = await qa.question.checkQuestionAvailableByNumber(input.question_id)
        questionId = question.id
      }

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        userId = user.id
      }

      const options = {
        page: input.page,
        page_size: input.page_size,
        sort_order: input.sort_order || 'desc',
        sort_by: input.sort_by || 'update_time'
      }
      const list = await trace.follow.getFollowQuestionList(questionId, userId, options)
      const count = await trace.follow.getFollowQuestionCount(questionId, userId)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await trace.follow.toExternal(item)
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async like() {

      const question = await this.checkQuestion()

      const { trace } = this.ctx.service

      await trace.like.likeQuestion(question)

    }

    async unlike() {

      const question = await this.checkQuestion()

      const { trace } = this.ctx.service

      await trace.like.unlikeQuestion(question)

    }

    async getLikeCount() {

      const question = await this.checkQuestion()

      const { qa } = this.ctx.service

      this.output.count = await qa.question.getQuestionLikeCount(question.id)

    }

    async getLikeList() {

      const input = this.filter(this.input, {
        question_id: 'number',
        user_id: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        question_id: {
          required: false,
          type: 'number'
        },
        user_id: {
          required: false,
          type: 'number'
        },
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { account, qa, trace } = this.ctx.service


      let questionId, userId

      if (input.question_id) {
        const question = await qa.question.checkQuestionAvailableByNumber(input.question_id)
        questionId = question.id
      }

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        userId = user.id
      }


      const options = {
        page: input.page,
        page_size: input.page_size,
        sort_order: input.sort_order || 'desc',
        sort_by: input.sort_by || 'update_time'
      }
      const list = await trace.like.getLikeQuestionList(questionId, userId, options)
      const count = await trace.like.getLikeQuestionCount(questionId, userId)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await trace.like.toExternal(item)
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async invite() {

      const input = this.filter(this.input, {
        question_id: 'number',
        user_id: 'number',
      })

      this.validate(input, {
        question_id: 'number',
        user_id: 'number',
      })

      const { account, qa, trace } = this.ctx.service

      const question = await qa.question.checkQuestionAvailableByNumber(input.question_id)
      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      await trace.invite.inviteQuestion(user, question)

    }

    async uninvite() {

      const input = this.filter(this.input, {
        question_id: 'number',
        user_id: 'number',
      })

      this.validate(input, {
        question_id: 'number',
        user_id: 'number',
      })

      const { account, qa, trace } = this.ctx.service

      const question = await qa.question.checkQuestionAvailableByNumber(input.question_id)
      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      await trace.invite.uninviteQuestion(user, question)

    }

    async ignoreInvite() {

      const input = this.filter(this.input, {
        question_id: 'number',
        user_id: 'number',
      })

      this.validate(input, {
        question_id: 'number',
        user_id: 'number',
      })

      const { account, qa, trace } = this.ctx.service

      const question = await qa.question.checkQuestionAvailableByNumber(input.question_id)
      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      await trace.invite.ignoreQuestion(user, question)

    }

    async inviteList() {

      const input = this.filter(this.input, {
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { account, qa, trace } = this.ctx.service

      const currentUser = await account.session.checkCurrentUser()

      const list = await trace.invite.getInviteQuestionList(null, currentUser.id, null, input)
      const count =  await trace.invite.getInviteQuestionCount(null, currentUser.id)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await trace.invite.toExternal(item)
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)


    }

    async inviteSuggestion() {

      const input = this.filter(this.input, {
        question_id: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        question_id: {
          required: false,
          type: 'number'
        },
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })


      const { account, qa, search, trace } = this.ctx.service

      const question = await qa.question.checkQuestionAvailableByNumber(input.question_id)

      const currentUser = await account.session.checkCurrentUser()

      input.types = [ 'account' ]
      input.fields = [ 'nickname', 'company', 'job', 'email', 'mobile', 'domain' ]

      const result = await search.search(input)

      const { list, pager } = result.data

      const users = [ ]
      let count = pager.total_size

      await util.each(
        list,
        async item => {
          const user = item.master
          if (user.user_id != currentUser.id) {
            const hasInvite = await trace.invite.hasInviteQuestion(question.id, user.user_id, currentUser.id)
            users.push({
              user,
              has_invite: hasInvite,
            })
          }
          else {
            count--
          }
          users
        }
      )

      this.output.list = users
      this.output.pager = this.createPager(input, count)

    }

  }

  return QuestionController

}