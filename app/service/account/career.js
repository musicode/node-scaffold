'use strict'

module.exports = app => {

  const { code, util, limit, redis, config } = app

  class Career extends app.BaseService {

    get tableName() {
      return 'account_career'
    }

    get fields() {
      return [
        'user_id', 'company', 'job', 'description', 'start_date', 'end_date'
      ]
    }

    format(career) {
      if (career.end_date === '0000-00-00') {
        career.end_date = ''
      }
    }

    /**
     * 通过 careerId 获取职业经历
     *
     * @param {number} careerId
     * @return {Object}
     */
    async getCareerById(careerId) {

      const { account } = this.service

      const key = `career:${careerId}`
      const value = await redis.get(key)

      if (value) {
        return util.parseObject(value)
      }

      const career = await this.findOneBy({
        id: careerId,
      })
      if (!career) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '该职业经历不存在'
        )
      }

      this.format(career)

      redis.set(key, util.stringifyObject(career))

      return career

    }

    /**
     * 添加一条职业经历
     *
     * @param {Object} data
     * @property {string} data.company
     * @property {string} data.job
     * @property {string} data.description
     * @property {string} data.start_date
     * @property {string} data.end_date
     * @return {number}
     */
    async createCareer(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      data.user_id = currentUser.id

      return await this.insert(data)

    }

    /**
     * 更新职业经历
     *
     * @param {Object} data
     * @property {string} data.company
     * @property {string} data.job
     * @property {string} data.description
     * @property {string} data.start_date
     * @property {string} data.end_date
     * @param {number} careerId
     * @return {boolean}
     */
    async updateCareerById(data, careerId) {
      await this.checkCareerOwner(careerId)
      const rows = await this.update(data, { id: careerId })
      if (rows === 1) {
        await this.updateRedis(`career:${careerId}`, data)
        return true
      }
      return false
    }

    /**
     * 删除职业经历
     *
     * @param {number} careerId
     * @return {boolean}
     */
    async deleteCareerById(careerId) {
      await this.checkCareerOwner(careerId)
      const rows = await this.delete({ id: careerId })
      if (rows === 1) {
        await redis.del(`career:${careerId}`)
        return true
      }
      return false
    }

    /**
     * 获取用户的职业经历列表
     *
     * @param {number} userId
     * @return {Array}
     */
    async getCareerListByUserId(userId) {

      const careerList = await this.findBy({
        where: {
          user_id: userId,
        }
      })

      careerList.forEach(
        career => {
          this.format(career)
        }
      )

      return careerList

    }

    /**
     * 是否是该职业经历的拥有者
     */
    async checkCareerOwner(careerId) {

      const { account } = this.service

      if (!careerId) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 career id'
        )
      }

      const career = await this.getCareerById(careerId)
      if (!career) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '职业经历不存在'
        )
      }

      const currentUser = await account.session.checkCurrentUser()

      if (career.user_id !== currentUser.id) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '只能操作自己的职业经历'
        )
      }

    }

  }
  return Career
}
