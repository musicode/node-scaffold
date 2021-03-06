'use strict'

module.exports = app => {

  const { util } = app

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
        college: 'education_college',
        speciality: 'education_speciality',
        degree: 'education_degree',
        description: {
          empty: true,
          type: 'education_description',
        },
        start_date: 'start_date',
        end_date: 'end_date',
      })

      const educationService = this.ctx.service.account.education
      const educationId = await educationService.createEducation(input)
      const education = await educationService.getEducationById(educationId)

      this.output.education = await educationService.toExternal(education)



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
        college: 'education_college',
        speciality: 'education_speciality',
        degree: 'education_degree',
        description: {
          empty: true,
          type: 'education_description',
        },
        start_date: 'start_date',
        end_date: 'end_date',
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
      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      const educationList = await account.education.getEducationListByUserId(user.id)

      await util.each(
        educationList,
        async (education, index) => {
          educationList[ index ] = await account.education.toExternal(education)
        }
      )

      this.output.list = educationList

    }

  }

  return EducationController

}