'use strict'

module.exports = app => {

  const { util, limit, config } = app

  class SystemController extends app.BaseController {

    async sync() {

      const { account, relation, privacy } = this.ctx.service

      let currentUser = await account.session.getCurrentUser()

      if (currentUser) {
        currentUser = await account.user.getFullUserById(currentUser.id)
        this.output.user = await account.user.toExternal(currentUser)
      }

      this.output.avatar = {
        male: config.avatar.male,
        female: config.avatar.female,
        group: config.avatar.group,
        anonymous: config.avatar.anonymous,
      }

      if (config.system.signupByInvite) {
        this.output.invite_code = {
          max_count: currentUser ? limit.INVITE_CODE_MAX_COUNT_PER_USER : 0,
        }
      }

    }

    async search() {

      const input = this.filter(this.input, {
        query: 'trim',
        page: 'number',
        page_size: 'number',
        sort_by: 'trim',
        sort_order: 'trim',
        types: 'array',
        fields: 'array',
      })

      this.validate(input, {
        query: {
          required: false,
          empty: true,
          type: 'string',
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
        types: 'array',
        fields: 'array',
      })

      const { account, search, qa, article, project, trace } = this.ctx.service

      const currentUser = await account.session.getCurrentUser()
      const result = await search.search(input)

      if (result.code === 0) {
        await util.each(
          result.data.list,
          async (item, index) => {

            const { master } = item

            let resource
            let resourceType

            switch (item.type) {
              case 'question':
                resource = await qa.question.checkQuestionAvailableByNumber(master.id)
                resourceType = trace.follow.TYPE_QUESTION
                break
              case 'post':
                resource = await article.post.checkPostAvailableByNumber(master.id)
                resourceType = trace.follow.TYPE_POST
                break
              case 'demand':
                resource = await project.demand.checkDemandAvailableByNumber(master.id)
                resourceType = trace.follow.TYPE_DEMAND
                break
            }

            if (master.user && master.user.user_id) {
              const user = await account.user.getFullUserById(master.user.user_id)
              master.user = await account.user.toExternal(user)
            }

            if (resourceType) {
              master.has_follow = await trace.follow.hasTrace({
                creator_id: currentUser.id,
                resource_id: resource.id,
                resource_type: resourceType,
              })
            }

          }
        )
      }

      this.ctx.body = result

    }

  }

  return SystemController

}