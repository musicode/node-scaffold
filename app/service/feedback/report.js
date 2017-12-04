
'use strict'

const STATUS_NORMAL = 0
const STATUS_STARED = 1
const STATUS_RESOLVED = 2
const STATUS_WAIT_RESOLVE = 3
const STATUS_MISTAKE = 4
const STATUS_DELETED = 5

const TYPE_QUESTION = 1
const TYPE_REPLY = 2
const TYPE_DEMAND = 3
const TYPE_CONSULT = 4
const TYPE_POST = 5
const TYPE_COMMENT = 6
const TYPE_USER = 7

const REASON_AD = 1
const REASON_SEX = 2
const REASON_FRAUD = 3
const REASON_RUMOUR = 4
const REASON_POLITICS = 5
const REASON_VIOLENCE = 6
const REASON_OTHER = 7

module.exports = app => {

  const { code, limit, config } = app

  class Report extends app.BaseService {

    get tableName() {
      return 'feedback_report'
    }

    get fields() {
      return [
        'user_id', 'resource_id', 'resource_type', 'reason', 'content', 'status',
      ]
    }

    get TYPE_QUESTION() {
      return TYPE_QUESTION
    }
    get TYPE_REPLY() {
      return TYPE_REPLY
    }
    get TYPE_DEMAND() {
      return TYPE_DEMAND
    }
    get TYPE_CONSULT() {
      return TYPE_CONSULT
    }
    get TYPE_POST() {
      return TYPE_POST
    }
    get TYPE_COMMENT() {
      return TYPE_COMMENT
    }
    get TYPE_USER() {
      return TYPE_USER
    }


    get REASON_AD() {
      return REASON_AD
    }
    get REASON_SEX() {
      return REASON_SEX
    }
    get REASON_FRAUD() {
      return REASON_FRAUD
    }
    get REASON_RUMOUR() {
      return REASON_RUMOUR
    }
    get REASON_POLITICS() {
      return REASON_POLITICS
    }
    get REASON_VIOLENCE() {
      return REASON_VIOLENCE
    }
    get REASON_OTHER() {
      return REASON_OTHER
    }

    async toExternal(report) {

      // [TODO] 类型待完善
      const { account, article } = this.service

      let resource, type

      switch (report.resource_type) {
        case TYPE_POST:
          type = 'post'
          resource = article.post.getFullPostById(report.resource_id)
          break

        case TYPE_COMMENT:
          type = 'comment'
          resource = article.comment.getFullCommentById(report.resource_id)
          break

        case TYPE_USER:
          type = 'user'
          resource = account.user.getFullUserById(report.resource_id)
          break
      }

      return {
        id: report.id,
        type,
        resource,
        reason: report.reason,
        content: report.content,
        create_time: report.create_time.getTime(),
        update_time: report.update_time.getTime()
      }

    }

    /**
     * 检查举报是否是对外可用状态
     *
     * @param {number|Object} reportId 举报 id
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkReportAvailableById(reportId, checkStatus) {

      let report
      if (reportId && reportId.id) {
        report = reportId
        reportId = report.id
      }

      if (!report && reportId) {
        report = await this.getReportById(reportId)
      }

      if (report
        && (!checkStatus
        || report.status !== STATUS_DELETED)
      ) {
        return report
      }

      this.throw(
        code.RESOURCE_NOT_FOUND,
        '该举报不存在'
      )

    }

    /**
     * 检查举报是否是对外可用状态
     *
     * @param {number} commentNumber 举报 number
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkReportAvailableByNumber(reportNumber, checkStatus) {

      const report = await this.findOneBy({
        number: reportNumber,
      })

      return await this.checkReportAvailableById(report, checkStatus)

    }

    /**
     * 获取 id 获取举报
     *
     * @param {number|Object} reportId
     * @return {Object}
     */
    async getReportById(reportId) {

      let report
      if (reportId && reportId.id) {
        report = reportId
        reportId = report.id
      }

      if (!report) {
        report = await this.findOneBy({ id: reportId })
      }

      return report
    }

    /**
     * 新建举报
     *
     * @param {Object} data
     * @property {number} data.resource_id
     * @property {number} data.resource_type
     * @property {number} data.reason
     * @property {string} data.content
     * @return {number} 新建的 report id
     */
    async createReport(data) {

      if (!data.resource_id) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 resource_id'
        )
      }

      if (!data.resource_type) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 resource_type'
        )
      }

      if (!data.reason) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 reason'
        )
      }

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const reportId = await this.insert({
        resource_id: data.resource_id,
        reasource_type: data.resource_type,
        reason: data.reason,
        content: data.content,
        user_id: currentUser.id,
      })

      if (reportId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '新增举报失败'
        )
      }

      return reportId

    }

    /**
     * 修改举报
     *
     * @param {Object} data
     * @property {number} data.status
     * @param {number|Object} reportId
     */
    async updateReportById(data, reportId) {

      if (util.type(data.status) !== 'number') {
        this.throw(
          code.PARAM_INVALID,
          '缺少 status'
        )
      }

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const report = await this.getReportById(reportId)

      await this.update(
        {
          status: data.status,
        },
        {
          id: report.id,
        }
      )

    }

    /**
     * 删除举报
     *
     * @param {number|Object} reportId
     */
    async deleteReport(reportId) {

      const { account, trace } = this.service

      await account.session.checkCurrentUser()

      const report = await this.getReportById(reportId)

      await this.update(
        {
          status: STATUS_DELETED,
        },
        {
          id: report.id,
        }
      )

    }

    /**
     * 获得举报列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getReportList(where, options) {
      this._formatWhere(where)
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获得举报数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getReportCount(where) {
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
        where.status = [ STATUS_NORMAL, STATUS_STARED ]
      }
    }

  }
  return Report
}
