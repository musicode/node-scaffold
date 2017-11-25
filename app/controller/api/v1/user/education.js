'use strict'

module.exports = app => {

  const { limit } = app

  class EducationController extends app.BaseController {

    async create() {

      const input = this.filter(this.input, {
        college: 'trim',
        speciality: 'trim',
        degree: 'trim',
        description: 'trim',
        start_date: 'trim',
        end_date: 'trim',
      })

      this.validate(input, {
        college: {
          type: 'string',
          max: limit.CAREER_COMPANY_MAX_LENGTH,
        },
        speciality: {
          type: 'string',
          max: limit.CAREER_JOB_MAX_LENGTH,
        },
        degree: limit.EDUCATION_DEGREE_VALUES,
        description: {
          type: 'string',
          max: limit.CAREER_DESCRIPTION_MAX_LENGTH,
        },
        start_date: {
          type: 'date',
        },
        end_date: {
          allowEmpty: true,
          type: 'date',
        }
      })

      const educationService = this.ctx.service.account.education
      const educationId = await educationService.createEducation(input)

      this.output.education = await educatioService.getEducationById(educationId)

    }

    async update() {

      const input = this.filter(this.input, {
        education_id: 'trim',
        college: 'trim',
        speciality: 'trim',
        degree: 'trim',
        description: 'trim',
        start_date: 'trim',
        end_date: 'trim',
      })

      this.validate(input, {
        education_id: 'string',
        college: {
          type: 'string',
          max: limit.CAREER_COMPANY_MAX_LENGTH,
        },
        speciality: {
          type: 'string',
          max: limit.CAREER_JOB_MAX_LENGTH,
        },
        degree: limit.EDUCATION_DEGREE_VALUES,
        description: {
          type: 'string',
          max: limit.CAREER_DESCRIPTION_MAX_LENGTH,
        },
        start_date: {
          type: 'date',
        },
        end_date: {
          allowEmpty: true,
          type: 'date',
        }
      })

      const educationService = this.ctx.service.account.education

      await educationService.updateEducationById(input, input.education_id)

    }

    async delete() {

      const input = this.filter(this.input, {
        education_id: 'trim',
      })

      this.validate(input, {
        education_id: 'string',
      })

      const educationService = this.ctx.service.account.education

      await educationService.deleteEducationById(input.education_id)

    }

    async list() {

      const input = this.filter(this.input, {
        user_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
      })

      const { account } = this.ctx.service
      const user = await account.user.getUserByNumber(input.user_id)

      const educationList = await account.education.getEducationListByUserId(user.id)

      this.output.list = educationList

    }

  }

  return EducationController

}