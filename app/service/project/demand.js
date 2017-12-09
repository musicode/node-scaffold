
'use strict'

const STATUS_ACTIVE = 0
const STATUS_AUDIT_SUCCESS = 1
const STATUS_AUDIT_FAIL = 2
const STATUS_DELETED = 3

module.exports = app => {

  const { code, util, limit, redis, config, eventEmitter } = app

  class Demand extends app.BaseService {

    get tableName() {
      return 'project_demand'
    }

    get fields() {
      return [
        'number', 'user_id', 'title', 'status',
      ]
    }

    async toExternal(demand) {

      if (util.type(demand.content) !== 'string') {
        demand = await this.getFullDemandById(demand)
      }

      const result = { }
      Object.assign(result, demand)

      const { id, number, user_id, anonymous } = result
      delete result.number
      delete result.user_id

      result.id = number

      result.cover = util.parseCover(result.content)

      const { account, trace } = this.service

      const currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        result.has_like = await trace.like.hasLikeDemand(currentUser.id, id)
        result.has_follow = await trace.follow.hasFollowDemand(currentUser.id, id)

        if (currentUser.id === user_id) {
          result.can_update = true
          const subCount = await this.getDemandSubCount(id)
          result.can_delete = subCount === 0
        }

      }

      const user = await account.user.getFullUserById(user_id)
      result.user = await account.user.toExternal(user)

      result.create_time = result.create_time.getTime()
      result.update_time = result.update_time.getTime()

      return result

    }

    /**
     * 检查项目是否是对外可用状态
     *
     * @param {number|Object} demandId 项目 id
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkDemandAvailableById(demandId, checkStatus) {

      let demand
      if (demandId && demandId.id) {
        demand = demandId
        demandId = demand.id
      }

      if (!demand && demandId) {
        demand = await this.getDemandById(demandId)
      }

      if (demand
        && (!checkStatus
        || demand.status === STATUS_ACTIVE
        || demand.status === STATUS_AUDIT_SUCCESS)
      ) {
        return demand
      }

      this.throw(
        code.RESOURCE_NOT_FOUND,
        '该项目不存在'
      )

    }

    /**
     * 检查项目是否是对外可用状态
     *
     * @param {number} commentNumber 项目 number
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkDemandAvailableByNumber(demandNumber, checkStatus) {

      const demand = await this.findOneBy({
        number: demandNumber,
      })

      return await this.checkDemandAvailableById(demand, checkStatus)

    }

    /**
     * 获取 id 获取项目
     *
     * @param {number|Object} demandId
     * @return {Object}
     */
    async getDemandById(demandId) {

      let demand
      if (demandId && demandId.id) {
        demand = demandId
        demandId = demand.id
      }

      if (!demand) {
        const key = `demand:${demandId}`
        const value = await redis.get(key)

        if (value) {
          demand = util.parseObject(value)
        }
        else {
          demand = await this.findOneBy({ id: demandId })
          await redis.set(key, util.stringifyObject(demand))
        }
      }

      return demand
    }

    /**
     * 获取项目的完整信息
     *
     * @param {number|Object} demandId
     * @return {Object}
     */
    async getFullDemandById(demandId) {

      const { project } = this.ctx.service

      const demand = await this.getDemandById(demandId)
      const demandContent = await project.demandContent.findOneBy({
        demand_id: demand.id,
      })

      demand.content = demandContent.content
      if (demandContent.update_time.getTime() > demand.update_time.getTime()) {
        demand.update_time = demandContent.update_time
      }

      demand.sub_count = await this.getDemandSubCount(demand.id)
      demand.view_count = await this.getDemandViewCount(demand.id)
      demand.like_count = await this.getDemandLikeCount(demand.id)
      demand.follow_count = await this.getDemandFollowCount(demand.id)

      return demand

    }

    /**
     * 新建项目
     *
     * @param {Object} data
     * @property {string} data.title
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @return {number} 新建的 demand id
     */
    async createDemand(data) {

      if (!data.title) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 title'
        )
      }
      if (!data.content) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 content'
        )
      }

      const { account, project, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const demandId = await this.transaction(
        async () => {

          const number = await this.createNumber(limit.POST_NUMBER_LENGTH)
          const demandId = await this.insert({
            number,
            title: data.title,
            user_id: currentUser.id,
          })

          await project.demandContent.insert({
            demand_id: demandId,
            content: data.content,
          })

          await trace.create.createDemand(demandId)

          return demandId

        }
      )

      if (demandId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '新增项目失败'
        )
      }

      eventEmitter.emit(
        eventEmitter.DEMAND_CREATE,
        {
          demandId,
          service: this.service,
        }
      )

      return demandId

    }

    /**
     * 修改项目
     *
     * @param {Object} data
     * @property {string} data.title
     * @property {string} data.content
     * @param {number|Object} demandId
     */
    async updateDemandById(data, demandId) {

      const { account, project, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const demand = await this.getDemandById(demandId)

      if (demand.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '没有权限修改该项目'
        )
      }

      let fields = this.getFields(data)

      const { content } = data

      await this.transaction(
        async () => {

          if (fields) {
            await this.update(
              fields,
              {
                id: demand.id,
              }
            )
          }

          if (content) {
            await project.demandContent.update(
              {
                content,
              },
              {
                demand_id: demand.id,
              }
            )
          }

        }
      )

      if (fields && content) {

        await this.updateRedis(`demand:${demand.id}`, fields)

        eventEmitter.emit(
          eventEmitter.DEMAND_UPDATE,
          {
            demandId: demand.id,
            service: this.service,
          }
        )
      }

    }

    /**
     * 删除项目
     *
     * @param {number|Object} demandId
     */
    async deleteDemand(demandId) {

      const { account, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const demand = await this.getDemandById(demandId)

      if (demand.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '不能删除别人的项目'
        )
      }

      const subCount = await this.getDemandSubCount(demand.id)
      if (subCount > 0) {
        this.throw(
          code.PERMISSION_DENIED,
          '已有评论的项目不能删除'
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
              id: demand.id,
            }
          )

          await trace.create.uncreateDemand(demand.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '删除项目失败'
        )
      }

      await this.updateRedis(`demand:${demand.id}`, fields)

      eventEmitter.emit(
        eventEmitter.DEMAND_UPDATE,
        {
          demandId: demand.id,
          service: this.service,
        }
      )

    }

    /**
     * 浏览项目
     *
     * @param {number|Object} demandId
     * @return {Object}
     */
    async viewDemand(demandId) {

      if (!config.demandViewByGuest) {
        const { account } = this.service
        const currentUser = await account.session.getCurrentUser()
        if (!currentUser) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览项目'
          )
        }
      }

      const demand = await this.getDemandById(demandId)

      return await this.getFullDemandById(demand)

    }

    /**
     * 获得项目列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getDemandList(where, options) {
      this._formatWhere(where)
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获得项目数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getDemandCount(where) {
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
     * 递增项目的被点赞量
     *
     * @param {number} demandId
     */
    async increaseDemandLikeCount(demandId) {
      const key = `demand_stat:${demandId}`
      const likeCount = await redis.hget(key, 'like_count')
      if (likeCount != null) {
        await redis.hincrby(key, 'like_count', 1)
      }
    }

    /**
     * 递减项目的被点赞量
     *
     * @param {number} demandId
     */
    async decreaseDemandLikeCount(demandId) {
      const key = `demand_stat:${demandId}`
      const likeCount = await redis.hget(key, 'like_count')
      if (likeCount != null) {
        await redis.hincrby(key, 'like_count', -1)
      }
    }

    /**
     * 获取项目的被点赞量
     *
     * @param {number} demandId
     * @return {number}
     */
    async getDemandLikeCount(demandId) {
      const key = `demand_stat:${demandId}`
      let likeCount = await redis.hget(key, 'like_count')
      if (likeCount == null) {
        likeCount = await this.service.trace.like.getLikeDemandCount(null, demandId)
        await redis.hset(key, 'like_count', likeCount)
      }
      else {
        likeCount = util.toNumber(likeCount, 0)
      }
      return likeCount
    }

    /**
     * 递增项目的关注量
     *
     * @param {number} demandId
     */
    async increaseDemandFollowCount(demandId) {
      const key = `demand_stat:${demandId}`
      const followCount = await redis.hget(key, 'follow_count')
      if (followCount != null) {
        await redis.hincrby(key, 'follow_count', 1)
      }
    }

    /**
     * 递减项目的关注量
     *
     * @param {number} demandId
     */
    async decreaseDemandFollowCount(demandId) {
      const key = `demand_stat:${demandId}`
      const followCount = await redis.hget(key, 'follow_count')
      if (followCount != null) {
        await redis.hincrby(key, 'follow_count', -1)
      }
    }

    /**
     * 获取项目的关注量
     *
     * @param {number} demandId
     * @return {number}
     */
    async getDemandFollowCount(demandId) {
      const key = `demand_stat:${demandId}`
      let followCount = await redis.hget(key, 'follow_count')
      if (followCount == null) {
        followCount = await this.service.trace.follow.getFollowDemandCount(null, demandId)
        await redis.hset(key, 'follow_count', followCount)
      }
      else {
        followCount = util.toNumber(followCount, 0)
      }
      return followCount
    }

    /**
     * 递增项目的浏览量
     *
     * @param {number} demandId
     */
    async increaseDemandViewCount(demandId) {
      // [TODO]这里不管有没有，必须递增
      // 因为靠数据库恢复不了
      await redis.hincrby(`demand_stat:${demandId}`, 'view_count', 1)
    }

    /**
     * 获取项目的浏览量
     *
     * @param {number} demandId
     * @return {number}
     */
    async getDemandViewCount(demandId) {
      // 这里不管有没有，必须读 redis
      // 因为靠数据库恢复不了
      let viewCount = await redis.hget(`demand_stat:${demandId}`, 'view_count')
      return util.toNumber(viewCount, 0)
    }

    /**
     * 递增项目的评论量
     *
     * @param {number} demandId
     */
    async increaseDemandSubCount(demandId) {
      const key = `demand_stat:${demandId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', 1)
      }
    }

    /**
     * 递减项目的评论量
     *
     * @param {number} demandId
     */
    async decreaseDemandSubCount(demandId) {
      const key = `demand_stat:${demandId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', -1)
      }
    }

    /**
     * 获取项目的评论量
     *
     * @param {number} demandId
     * @return {number}
     */
    async getDemandSubCount(demandId) {
      const key = `demand_stat:${demandId}`
      let subCount = await redis.hget(key, 'sub_count')
      if (subCount == null) {
        subCount = await this.service.project.consult.getConsultCount({
          demand_id: demandId,
        })
        await redis.hset(key, 'sub_count', subCount)
      }
      else {
        subCount = util.toNumber(subCount, 0)
      }
      return subCount
    }

  }
  return Demand
}
