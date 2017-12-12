'use strict'

module.exports = app => {

  const { util, limit } = app

  class CareerController extends app.BaseController {

    async create() {

      const input = this.filter(this.input, {
        company: 'trim',
        job: 'trim',
        description: 'trim',
        start_date: 'trim',
        end_date: 'trim',
      })

      this.validate(input, {
        company: {
          type: 'string',
          max: limit.CAREER_COMPANY_MAX_LENGTH,
        },
        job: {
          type: 'string',
          max: limit.CAREER_JOB_MAX_LENGTH,
        },
        description: {
          empty: true,
          type: 'string',
          max: limit.CAREER_DESCRIPTION_MAX_LENGTH,
        },
        start_date: 'date',
        end_date: 'end_date'
      })

      const careerService = this.ctx.service.account.career
      const careerId = await careerService.createCareer(input)
      const career = await careerService.getCareerById(careerId)

      this.output.career = await careerService.toExternal(career)

    }

    async update() {

      const input = this.filter(this.input, {
        career_id: 'trim',
        company: 'trim',
        job: 'trim',
        description: 'trim',
        start_date: 'trim',
        end_date: 'trim',
      })

      this.validate(input, {
        career_id: 'string',
        company: {
          type: 'string',
          max: limit.CAREER_COMPANY_MAX_LENGTH,
        },
        job: {
          type: 'string',
          max: limit.CAREER_JOB_MAX_LENGTH,
        },
        description: {
          empty: true,
          type: 'string',
          max: limit.CAREER_DESCRIPTION_MAX_LENGTH,
        },
        start_date: 'date',
        end_date: 'end_date'
      })

      const careerService = this.ctx.service.account.career

      await careerService.updateCareerById(input, input.career_id)

    }

    async delete() {

      const input = this.filter(this.input, {
        career_id: 'trim',
      })

      this.validate(input, {
        career_id: 'string',
      })

      const careerService = this.ctx.service.account.career

      await careerService.deleteCareerById(input.career_id)

    }

    async list() {

      const input = this.filter(this.input, {
        user_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
      })

      const { account } = this.ctx.service
      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      const careerList = await account.career.getCareerListByUserId(user.id)

      await util.each(
        careerList,
        async (career, index) => {
          careerList[ index ] = await account.career.toExternal(career)
        }
      )

      this.output.list = careerList

    }

  }

  return CareerController

}