'use strict'

module.exports = app => {

  const { code, util, limit, redis, config } = app

  class Education extends app.BaseService {

    get tableName() {
      return 'account_education'
    }

    get fields() {
      return [
        'user_id', 'college', 'speciality', 'degree', 'description', 'start_date', 'end_date'
      ]
    }

    format(education) {
      if (!education.end_date || education.end_date === '0000-00-00') {
        education.end_date = limit.SOFAR
      }
    }

    async toExternal(education) {
      education.start_date = education.start_date.getTime()
      if (util.type(education.end_date) === 'date') {
        education.end_date = education.end_date.getTime()
      }

      education.create_time = education.create_time.getTime()
      education.update_time = education.update_time.getTime()
      return education
    }

    /**
     * 通过 educationId 获取教育经历
     *
     * @param {number} educationId
     * @return {Object}
     */
    async getEducationById(educationId) {

      const { account } = this.service

      const key = `education:${educationId}`
      const value = await redis.get(key)

      if (value) {
        return util.parseObject(value)
      }

      const education = await this.findOneBy({
        id: educationId,
      })
      if (!education) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '该教育经历不存在'
        )
      }

      this.format(education)

      redis.set(key, util.stringifyObject(education))

      return education

    }

    /**
     * 添加一条教育经历
     *
     * @param {Object} data
     * @property {string} data.college
     * @property {string} data.speciality
     * @property {string} data.degree
     * @property {string} data.description
     * @property {string} data.start_date
     * @property {string} data.end_date
     * @return {number}
     */
    async createEducation(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      data.user_id = currentUser.id

      const fields = this.getFields(data)
      if (fields) {
        if (fields.end_date == limit.SOFAR) {
          delete fields.end_date
        }
        this.checkDateRange(fields.start_date, fields.end_date)
        return await this.insert(fields)
      }

    }

    /**
     * 更新教育经历
     *
     * @param {Object} data
     * @property {string} data.college
     * @property {string} data.speciality
     * @property {string} data.degree
     * @property {string} data.description
     * @property {string} data.start_date
     * @property {string} data.end_date
     * @param {number} educationId
     * @return {boolean}
     */
    async updateEducationById(data, educationId) {
      await this.checkEducationOwner(educationId)
      const fields = this.getFields(data)
      if (fields) {
        if (fields.end_date == limit.SOFAR) {
          delete fields.end_date
        }
        this.checkDateRange(fields.start_date, fields.end_date)
        const rows = await this.update(fields, { id: educationId })
        if (rows === 1) {
          await this.updateRedis(`education:${educationId}`, fields)
          return true
        }
      }
      return false
    }

    /**
     * 删除教育经历
     *
     * @param {number} educationId
     * @return {boolean}
     */
    async deleteEducationById(educationId) {
      await this.checkEducationOwner(educationId)
      const rows = await this.delete({ id: educationId })
      if (rows === 1) {
        await redis.del(`education:${educationId}`)
        return true
      }
      return false
    }

    /**
     * 获取用户的教育经历列表
     */
    async getEducationListByUserId(userId) {

      const educationList = await this.findBy({
        where: {
          user_id: userId,
        },
        sort_by: 'create_time',
        sort_order: 'asc',
      })

      educationList.forEach(
        education => {
          this.format(education)
        }
      )

      return educationList

    }

    /**
     * 判断开始日期和结束日期是否合法
     *
     * @param {string} startDate
     * @param {string} endDate
     */
    checkDateRange(startDate, endDate) {
      if (endDate) {
        startDate = util.parseDate(startDate)
        endDate = util.parseDate(endDate)
        if (startDate.getTime() > endDate.getTime()) {
          this.throw(
            code.PARAM_INVALID,
            '开始日期不能晚于结束日期'
          )
        }
      }
    }

    /**
     * 是否是该教育经历的拥有者
     */
    async checkEducationOwner(educationId) {

      const { account } = this.service

      if (!educationId) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 education id'
        )
      }

      const education = await this.getEducationById(educationId)
      if (!education) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '教育经历不存在'
        )
      }

      const currentUser = await account.session.checkCurrentUser()

      if (education.user_id !== currentUser.id) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '只能操作自己的教育经历'
        )
      }

    }

  }
  return Education
}
