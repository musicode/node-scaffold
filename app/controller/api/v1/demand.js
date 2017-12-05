'use strict'

module.exports = app => {

  const { util, limit } = app

  class DemandController extends app.BaseController {

    async checkDemand() {

      const input = this.filter(this.input, {
        demand_id: 'trim',
      })

      this.validate(input, {
        demand_id: 'string',
      })

      const { project } = this.ctx.service

      return await project.demand.checkDemandAvailableByNumber(input.demand_id, true)

    }

    async detail() {

      let demand = await this.checkDemand()

      const { project } = this.ctx.service

      demand = await project.demand.viewDemand(demand)

      this.output.demand = await project.demand.toExternal(demand)

    }

    async view() {

      const demand = await this.checkDemand()

      const { trace } = this.ctx.service

      trace.view.viewDemand(demand.id)

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
        page: 'number',
        page_size: 'number',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { account, project } = this.ctx.service
      const currentUser = await account.session.getCurrentUser()

      const where = { }

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        where.user_id = user.id
      }

      if (util.type(input.status) === 'number') {
        where.status = input.status
      }

      const options = {
        page: input.page,
        page_size: input.page_size,
        sort_order: input.sort_order || 'desc',
        sort_by: input.sort_by || 'create_time'
      }
      const list = await project.demand.getDemandList(where, options)
      const count = await project.demand.getDemandCount(where)

      await util.each(
        list,
        async (item, index) => {
          item = await project.demand.toExternal(item)
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
      })

      this.validate(input, {
        title: {
          type: 'string',
          min: limit.DEMAND_TITLE_MIN_LENGTH,
          max: limit.DEMAND_TITLE_MAX_LENGTH,
        },
        content: {
          type: 'string',
          min: limit.DEMAND_CONTENT_MIN_LENGTH,
          max: limit.DEMAND_CONTENT_MAX_LENGTH,
        }
      })

      const demandService = this.ctx.service.project.demand

      const demandId = await demandService.createDemand(input)
      const demand = await demandService.getFullDemandById(demandId)

      this.output.demand = await demandService.toExternal(demand)

    }

    async update() {

      const input = this.filter(this.input, {
        demand_id: 'trim',
        title: 'trim',
        content: 'trim',
      })

      this.validate(input, {
        demand_id: 'string',
        title: {
          type: 'string',
          min: limit.DEMAND_TITLE_MIN_LENGTH,
          max: limit.DEMAND_TITLE_MAX_LENGTH,
        },
        content: {
          type: 'string',
          min: limit.DEMAND_CONTENT_MIN_LENGTH,
          max: limit.DEMAND_CONTENT_MAX_LENGTH,
        },
      })

      const demandService = this.ctx.service.project.demand

      const demand = await demandService.checkDemandAvailableByNumber(input.demand_id)

      await demandService.updateDemandById(input, demand)

    }

    async delete() {

      const demand = await this.checkDemand()

      const { project } = this.ctx.service

      await project.demand.deleteDemand(demand)

    }

    async follow() {

      const demand = await this.checkDemand()

      const { trace } = this.ctx.service

      await trace.follow.followDemand(demand)

    }

    async unfollow() {

      const demand = await this.checkDemand()

      const { trace } = this.ctx.service

~     await trace.follow.unfollowDemand(demand)

    }

    async getFollowCount() {

      const demand = await this.checkDemand()

      const { project } = this.ctx.service

      this.output.count = await project.demand.getDemandFollowCount(demand.id)

    }

    async getFollowList() {

      const input = this.filter(this.input, {
        demand_id: 'number',
        user_id: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        demand_id: {
          required: false,
          type: 'number'
        },
        user_id: {
          required: false,
          type: 'number'
        },
        page: 'number',
        page_size: 'number',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { account, project, trace } = this.ctx.service

      let demandId, userId

      if (input.demand_id) {
        const demand = await project.demand.checkDemandAvailableByNumber(input.demand_id)
        demandId = demand.id
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
      const list = await trace.follow.getFollowDemandList(userId, demandId, options)
      const count = await trace.follow.getFollowDemandCount(userId, demandId)

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

      const demand = await this.checkDemand()

      const { trace } = this.ctx.service

      await trace.like.likeDemand(demand)

    }

    async unlike() {

      const demand = await this.checkDemand()

      const { trace } = this.ctx.service

      await trace.like.unlikeDemand(demand)

    }

    async getLikeCount() {

      const demand = await this.checkDemand()

      const { project } = this.ctx.service

      this.output.count = await project.demand.getDemandLikeCount(demand.id)

    }

    async getLikeList() {

      const input = this.filter(this.input, {
        demand_id: 'number',
        user_id: 'number',
        page: 'number',
        page_size: 'number',
        sort_order: 'string',
        sort_by: 'string',
      })

      this.validate(input, {
        demand_id: {
          required: false,
          type: 'number'
        },
        user_id: {
          required: false,
          type: 'number'
        },
        page: 'number',
        page_size: 'number',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order'
        },
      })

      const { account, project, trace } = this.ctx.service


      let demandId, userId

      if (input.demand_id) {
        const demand = await project.demand.checkDemandAvailableByNumber(input.demand_id)
        demandId = demand.id
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
      const list = await trace.like.getLikeDemandList(userId, demandId, options)
      const count = await trace.like.getLikeDemandCount(userId, demandId)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await trace.like.toExternal(item)
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

  }

  return DemandController

}