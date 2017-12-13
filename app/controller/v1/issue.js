'use strict'

module.exports = app => {

  const { util, limit } = app

  class IssueController extends app.BaseController {

    async create() {

      const input = this.filter(this.input, {
        content: 'trim',
        anonymous: 'number',
      })

      this.validate(input, {
        content: 'issue_content',
        anonymous: 'anonymous',
      })

      const issueService = this.ctx.service.feedback.issue

      const issueId = await issueService.createIssue(input)
      const issue = await issueService.getIssueById(issueId)

      this.output.issue = await issueService.toExternal(issue)

    }

  }

  return IssueController

}