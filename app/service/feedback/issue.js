
'use strict'

const STATUS_ACTIVE = 0
const STATUS_STARED = 1
const STATUS_RESOLVED = 2
const STATUS_DELAY_RESOLVE = 3
const STATUS_NO_RESOLVE = 4
const STATUS_DELETED = 5

module.exports = app => {

  const { code, limit, config } = app

  class Issue extends app.BaseService {

    get tableName() {
      return 'feedback_issue'
    }

    get fields() {
      return [
        'number', 'user_id', 'content', 'anonymous', 'status',
      ]
    }

    async toExternal(issue) {

      issue.create_time = issue.create_time.getTime()
      issue.update_time = issue.update_time.getTime()

      return issue

    }

    /**
     * 检查反馈是否是对外可用状态
     *
     * @param {number|Object} issueId 反馈 id
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkIssueAvailableById(issueId, checkStatus) {

      let issue
      if (issueId && issueId.id) {
        issue = issueId
        issueId = issue.id
      }

      if (!issue && issueId) {
        issue = await this.getIssueById(issueId)
      }

      if (issue
        && (!checkStatus
        || issue.status !== STATUS_DELETED)
      ) {
        return issue
      }

      this.throw(
        code.RESOURCE_NOT_FOUND,
        '该反馈不存在'
      )

    }

    /**
     * 检查反馈是否是对外可用状态
     *
     * @param {number} commentNumber 反馈 number
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkIssueAvailableByNumber(issueNumber, checkStatus) {

      const issue = await this.findOneBy({
        number: issueNumber,
      })

      return await this.checkIssueAvailableById(issue, checkStatus)

    }

    /**
     * 获取 id 获取反馈
     *
     * @param {number|Object} issueId
     * @return {Object}
     */
    async getIssueById(issueId) {

      let issue
      if (issueId && issueId.id) {
        issue = issueId
        issueId = issue.id
      }

      if (!issue) {
        issue = await this.findOneBy({ id: issueId })
      }

      return issue
    }

    /**
     * 新建反馈
     *
     * @param {Object} data
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @return {number} 新建的 issue id
     */
    async createIssue(data) {

      if (!data.content) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 content'
        )
      }

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const issueId = await this.transaction(
        async () => {

          const anonymous = data.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO
          const issueId = await this.insert({
            content: data.content,
            user_id: currentUser.id,
            anonymous,
          })

          return issueId

        }
      )

      if (issueId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '新增反馈失败'
        )
      }

      return issueId

    }

    /**
     * 修改反馈
     *
     * @param {Object} data
     * @property {string} data.content
     * @property {number} data.status
     * @property {boolean|number} data.anonymous
     * @param {number|Object} issueId
     */
    async updateIssueById(data, issueId) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const issue = await this.getIssueById(issueId)

      if (issue.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '没有权限修改该反馈'
        )
      }

      let fields = this.getFields(data)

      await this.transaction(
        async () => {

          if (fields) {
            if ('anonymous' in fields) {
              fields.anonymous = fields.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO
              if (fields.anonymous === issue.anonymous) {
                delete fields.anonymous
              }
            }
            if (Object.keys(fields).length) {
              await this.update(
                fields,
                {
                  id: issue.id,
                }
              )
            }
          }

        }
      )

    }

    /**
     * 删除反馈
     *
     * @param {number|Object} issueId
     */
    async deleteIssue(issueId) {

      const { account, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const issue = await this.getIssueById(issueId)

      if (issue.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '不能删除别人的反馈'
        )
      }

      const fields = {
        status: STATUS_DELETED,
      }

      const isSuccess = await this.transaction(
        async () => {

          await this.update(
            fields,
            {
              id: issue.id,
            }
          )

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '删除反馈失败'
        )
      }

    }

    /**
     * 浏览反馈
     *
     * @param {number|Object} issueId
     * @return {Object}
     */
    async viewIssue(issueId) {

      if (!config.issueViewByGuest) {
        const { account } = this.service
        const currentUser = await account.session.getCurrentUser()
        if (!currentUser) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览反馈'
          )
        }
      }

      const issue = await this.getIssueById(issueId)

      return await this.getFullIssueById(issue)

    }

    /**
     * 获得反馈列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getIssueList(where, options) {
      this._formatWhere(where)
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获得反馈数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getIssueCount(where) {
      this._formatWhere(where)
      return await this.countBy(where)
    }

    /**
     * 格式化查询条件
     *
     * @param {Object} where
     */
    _formatWhere(where) {
      if ('status' in where) {
        if (where.status < 0) {
          delete where.status
        }
      }
      else {
        where.status = [ STATUS_ACTIVE, STATUS_STARED ]
      }
    }

  }
  return Issue
}
