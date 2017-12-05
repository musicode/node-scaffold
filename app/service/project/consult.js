
'use strict'

const STATUS_ACTIVE = 0
const STATUS_AUDIT_SUCCESS = 1
const STATUS_AUDIT_FAIL = 2
const STATUS_DELETED = 3

module.exports = app => {

  const { code, util, limit, redis, config, eventEmitter } = app

  class Consult extends app.BaseService {

    get tableName() {
      return 'project_consult'
    }

    get fields() {
      return [
        'number', 'user_id', 'demand_id', 'parent_id', 'status',
      ]
    }

    async toExternal(consult) {

      if (!('content' in consult)) {
        consult = await this.getFullConsultById(consult)
      }

      const result = { }
      Object.assign(result, consult)

      const { id, number, user_id, demand_id, parent_id } = result
      delete result.number
      delete result.user_id
      delete result.demand_id
      delete result.parent_id

      result.id = number

      const { account, project, trace, } = this.service
      const user = await account.user.getFullUserById(user_id)
      result.user = await account.user.toExternal(user)

      if (parent_id) {
        const parentConsult = await this.getConsultById(parent_id)
        result.parent_id = parentConsult.number

        const parentUser = await account.user.getFullUserById(parentConsult.user_id)
        result.parent_user = await account.user.toExternal(parentUser)
      }

      const demand = await project.demand.getFullDemandById(demand_id)
      result.demand = await project.demand.toExternal(demand)

      const currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        if (currentUser.id === user_id) {
          result.can_update = true
          const subCount = await this.getConsultSubCount(id)
          result.can_delete = subCount === 0
        }
      }

      result.create_time = result.create_time.getTime()
      result.update_time = result.update_time.getTime()

      return result

    }

    /**
     * 检查咨询是否是对外可用状态
     *
     * @param {number|Object} consultId 咨询 id
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkConsultAvailableById(consultId, checkStatus) {

      let consult
      if (consultId && consultId.id) {
        consult = consultId
        consultId = consult.id
      }

      if (!consult && consultId) {
        consult = await this.getConsultById(consultId)
      }

      if (consult
        && (!checkStatus
        || consult.status === STATUS_ACTIVE
        || consult.status === STATUS_AUDIT_SUCCESS)
      ) {
        return consult
      }

      this.throw(
        code.RESOURCE_NOT_FOUND,
        '该咨询不存在'
      )

    }

    /**
     * 检查咨询是否是对外可用状态
     *
     * @param {number} consultNumber 咨询 number
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkConsultAvailableByNumber(consultNumber, checkStatus) {

      const consult = await this.findOneBy({
        number: consultNumber,
      })

      return await this.checkConsultAvailableById(consult, checkStatus)

    }

    /**
     * 通过 id 获取咨询
     *
     * @param {number|Object} consultId
     * @return {Object}
     */
    async getConsultById(consultId) {

      let consult
      if (consultId && consultId.id) {
        consult = consultId
        consultId = consult.id
      }

      if (!consult) {
        consult = await this.findOneBy({ id: consultId })
      }

      return consult

    }

    /**
     * 获取咨询的完整信息
     *
     * @param {number|Object} consultId
     * @return {Object}
     */
    async getFullConsultById(consultId) {

      const { project } = this.ctx.service

      const consult = await this.getConsultById(consultId)

      const record = await project.consultContent.findOneBy({
        consult_id: consult.id,
      })

      consult.sub_count = await this.getConsultSubCount(consult.id)

      consult.content = record.content
      if (record.update_time.getTime() > consult.update_time.getTime()) {
        consult.update_time = record.update_time
      }

      return consult

    }

    /**
     * 创建咨询
     *
     * @param {Object} data
     * @property {string} data.content
     * @property {number} data.demand_id
     * @property {number} data.parent_id
     */
    async createConsult(data) {

      const { account, project, trace } = this.service

      if (!data.demand_id) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 demand_id'
        )
      }

      if (!data.content) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 content'
        )
      }

      const currentUser = await account.session.checkCurrentUser();

      const consultId = await this.transaction(
        async () => {

          const number = await this.createNumber(limit.COMMENT_NUMBER_LENGTH)

          const row = {
            number,
            user_id: currentUser.id,
            demand_id: data.demand_id,
          }

          if (data.parent_id) {
            row.parent_id = data.parent_id
          }

          const consultId = await this.insert(row)

          await project.consultContent.insert({
            consult_id: consultId,
            content: data.content,
          })

          await trace.create.createConsult(consultId, data.demand_id, data.parent_id)

          return consultId

        }
      )

      if (consultId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '新增咨询失败'
        )
      }

      await project.demand.increaseDemandSubCount(data.demand_id)

      if (data.parent_id) {
        await this.increaseConsultSubCount(data.parent_id)
      }

      eventEmitter.emit(
        eventEmitter.CONSULT_ADD,
        {
          consultId,
          service: this.service,
        }
      )

      return consultId

    }


    /**
     * 修改咨询
     *
     * @param {Object} data
     * @property {string} data.content
     * @param {number|Object} consultId
     */
    async updateConsultById(data, consultId) {

      const { account, project, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const consult = await this.getConsultById(consultId)

      if (consult.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '没有权限修改该咨询'
        )
      }

      const { content } = data

      let fields = this.getFields(data)

      await this.transaction(
        async () => {

          if (fields) {
            await this.update(
              fields,
              {
                id: consult.id,
              }
            )
          }

          if (content) {
            await project.consultContent.update(
              {
                content,
              },
              {
                consult_id: consult.id,
              }
            )
          }

        }
      )

      if (fields && content) {
        eventEmitter.emit(
          eventEmitter.CONSULT_UDPATE,
          {
            consultId: consult.id,
            service: this.service,
          }
        )
      }

    }

    /**
     * 删除咨询
     *
     * @param {number|Object} consultId
     */
    async deleteConsult(consultId) {

      const { account, project, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const consult = await this.getConsultById(consultId)

      if (consult.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '不能删除别人的咨询'
        )
      }

      const subCount = await this.getConsultSubCount(consult.id)
      if (subCount > 0) {
        this.throw(
          code.PERMISSION_DENIED,
          '已有咨询的咨询不能删除'
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
              id: consult.id,
            }
          )

          await trace.create.uncreateConsult(consult.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '删除咨询失败'
        )
      }

      await project.demand.decreaseDemandSubCount(consult.demand_id)

      if (consult.parent_id) {
        await this.decreaseConsultSubCount(consult.parent_id)
      }

      eventEmitter.emit(
        eventEmitter.CONSULT_UDPATE,
        {
          consultId: consult.id,
          service: this.service,
        }
      )

    }

    /**
     * 浏览咨询
     *
     * @param {number|Object} consultId
     * @return {Object}
     */
    async viewConsult(consultId) {

      if (!config.consultViewByGuest) {
        const { account } = this.service
        const currentUser = await account.session.getCurrentUser()
        if (!currentUser) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览咨询'
          )
        }
      }

      const consult = await this.getConsultById(consultId)

      return await this.getFullConsultById(consult)

    }

    /**
     * 获得咨询列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getConsultList(where, options) {
      this._formatWhere(where)
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获得咨询数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getConsultCount(where) {
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
        where.status = [ STATUS_ACTIVE, STATUS_AUDIT_SUCCESS ]
      }
    }



    /**
     * 递增咨询的咨询量
     *
     * @param {number} consultId
     */
    async increaseConsultSubCount(consultId) {
      const key = `consult_stat:${consultId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', 1)
      }
    }

    /**
     * 递减咨询的咨询量
     *
     * @param {number} consultId
     */
    async decreaseConsultSubCount(consultId) {
      const key = `consult_stat:${consultId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', -1)
      }
    }

    /**
     * 获取咨询的咨询量
     *
     * @param {number} consultId
     * @return {number}
     */
    async getConsultSubCount(consultId) {
      const key = `consult_stat:${consultId}`
      let subCount = await redis.hget(key, 'sub_count')
      if (subCount == null) {
        subCount = await this.getConsultCount({
          parent_id: consultId,
        })
        await redis.hset(key, 'sub_count', subCount)
      }
      else {
        subCount = util.toNumber(subCount, 0)
      }
      return subCount
    }

  }
  return Consult
}
