'use strict'

module.exports = app => {

  const { code, util, limit } = app

  class ReportController extends app.BaseController {

    async create() {

      const { account, article, feedback } = this.ctx.service

      const input = this.filter(this.input, {
        resource_id: 'number',
        resource_type: 'trim',
        reason: 'number',
        content: 'trim',
      })

      this.validate(input, {
        resource_id: 'number',
        resource_type: [
          'question',
          'reply',
          'demand',
          'consult',
          'post',
          'comment',
          'user'
        ],
        reason: [
          feedback.report.REASON_AD,
          feedback.report.REASON_SEX,
          feedback.report.REASON_FRAUD,
          feedback.report.REASON_RUMOUR,
          feedback.report.REASON_POLITICS,
          feedback.report.REASON_VIOLENCE,
          feedback.report.REASON_OTHER,
        ],
        content: {
          required: false,
          empty: true,
          type: 'string',
        },
      })

      let resource

      switch (input.resource_type) {

        case 'post':
          resource = await article.post.checkPostAvailableByNumber(input.resource_id)
          input.resource_type = feedback.report.TYPE_POST
          break

        case 'comment':
          resource = await article.comment.checkCommentAvailableByNumber(input.resource_id)
          input.resource_type = feedback.report.TYPE_COMMENT
          break

        case 'user':
          resource = await account.user.checkUserAvailableByNumber(input.resource_id)
          input.resource_type = feedback.report.TYPE_USER
          break
      }

      if (!resource) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '被举报的资源不存在'
        )
      }

      input.resource_id = resource.id

      const reportId = await feedback.report.createReport(input)
      const report = await feedback.report.getReportById(reportId)

      this.output.report = await feedback.report.toExternal(report)

    }

  }

  return ReportController

}