'use strict'

module.exports = app => {

  const { util, limit } = app

  class ConsultController extends app.BaseController {

    async checkConsult() {

      const input = this.filter(this.input, {
        consult_id: 'trim',
      })

      this.validate(input, {
        consult_id: 'string',
      })

      const { project } = this.ctx.service

      return await project.consult.checkConsultAvailableByNumber(input.consult_id, true)

    }

    async detail() {

      let consult = await this.checkConsult()

      const { project } = this.ctx.service

      consult = await project.consult.viewConsult(consult)

      this.output.consult = await project.consult.toExternal(consult)

    }

    async list() {

      const input = this.filter(this.input, {
        demand_id: 'number',
        user_id: 'number',
        status: 'number',
        content_max_length: 'number',
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

      const { account, project } = this.ctx.service
      const currentUser = await account.session.getCurrentUser()

      const where = { }

      if (input.user_id) {
        const user = await account.user.checkUserAvailableByNumber(input.user_id)
        where.user_id = user.id
      }

      if (input.demand_id) {
        const demand = await project.demand.checkDemandAvailableByNumber(input.demand_id)
        where.demand_id = demand.id
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
      const list = await project.consult.getConsultList(where, options)
      const count = await project.consult.getConsultCount(where)

      await util.each(
        list,
        async (item, index) => {
          list[ index ] = await project.consult.toExternal(item)
        }
      )

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async create() {

      const input = this.filter(this.input, {
        demand_id: 'number',
        parent_id: 'number',
        content: 'trim',
      })

      this.validate(input, {
        demand_id: 'number',
        parent_id: {
          required: false,
          type: 'number',
        },
        content: {
          type: 'string',
          max: limit.CONSULT_CONTENT_MAX_LENGTH,
        }
      })

      const { project } = this.ctx.service

      const demand = await project.demand.checkDemandAvailableByNumber(input.demand_id)
      input.demand_id = demand.id

      if (input.parent_id) {
        const consult = await project.consult.checkConsultAvailableByNumber(input.parent_id)
        input.parent_id = consult.id
      }

      const consultId = await project.consult.createConsult(input)
      const consult = await project.consult.getFullConsultById(consultId)

      this.output.consult = await project.consult.toExternal(consult)

    }

    async update() {

      const input = this.filter(this.input, {
        consult_id: 'trim',
        content: 'trim',
      })

      this.validate(input, {
        consult_id: 'string',
        content: {
          type: 'string',
          max: limit.CONSULT_CONTENT_MAX_LENGTH,
        },
      })

      const consultService = this.ctx.service.project.consult

      const consult = await consultService.checkConsultAvailableByNumber(input.consult_id)

      await consultService.updateConsultById(input, consult)

    }

    async delete() {

      const consult = await this.checkConsult()

      const { project } = this.ctx.service

      await project.consult.deleteConsult(consult)

    }

  }

  return ConsultController

}