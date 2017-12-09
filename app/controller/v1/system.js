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
        page: 'number',
        page_size: 'number',
        sort_by: 'trim',
        sort_order: 'trim',
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
          type: 'sort_order',
        },
      })

      const { types, fields } = this.input

      if (!types || util.type(types) !== 'array') {
        this.throw(
          code.PARAM_INVALID,
          'types 必须传数组'
        )
      }

      if (!fields || util.type(fields) !== 'array') {
        this.throw(
          code.PARAM_INVALID,
          'fields 必须传数组'
        )
      }

      const { search } = this.ctx.service

      input.types = this.input.types
      input.fields = this.input.fields

      const result = await search.search(input)

      // await util.each(
      //   list,
      //   async (item, index) => {
      //     // [TODO] 已关注逻辑
      //   }
      // )

      this.ctx.body = result

    }

  }

  return SystemController

}