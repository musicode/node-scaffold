'use strict'

module.exports = app => {

  const { util } = app

  class TraceController extends app.BaseController {

    async friend() {

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

      const { account, relation, search } = this.ctx.service

      const friendIds = await relation.friend.getFrienIdListForNews()

      if (friendIds.length) {
        input.type = this.input.type

        const friendNumbers = [ ]
        await util.each(
          friendIds,
          async id => {
            const { number } = await account.user.getUserById(id)
            friendNumbers.push(number)
          }
        )

        input.user_number = friendNumbers

        const result = await search.news(input)

        this.ctx.body = result

      }
      else {
        this.output.list = [ ]
        this.output.pager = this.createPager(input, 0)
      }


    }

  }

  return TraceController

}