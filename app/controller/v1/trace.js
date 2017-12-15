'use strict'

module.exports = app => {

  const { util } = app

  class TraceController extends app.BaseController {

    async friend() {

      const input = this.filter(this.input, {
        ts: 'trim',
        type: 'array',
        page: 'number',
        page_size: 'number',
        sort_by: 'trim',
        sort_order: 'trim',
      })

      this.validate(input, {
        ts: {
          required: false,
          empty: true,
          type: 'string',
        },
        type: 'array',
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

      const { account, relation, search } = this.ctx.service

      const friendIds = await relation.friend.getFrienIdListForNews()

      if (friendIds.length) {
        input.user_ids = friendIds
        this.ctx.body = await search.news(input)
      }
      else {
        this.output.list = [ ]
        this.output.pager = this.createPager(input, 0)
      }


    }

  }

  return TraceController

}