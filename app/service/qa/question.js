
'use strict'

const STATUS_ACTIVE = 0
const STATUS_AUDIT_SUCCESS = 1
const STATUS_AUDIT_FAIL = 2
const STATUS_DELETED = 3

module.exports = app => {

  const { code, util, limit, redis, config, eventEmitter } = app

  class Question extends app.BaseService {

    get tableName() {
      return 'qa_question'
    }

    get fields() {
      return [
        'number', 'user_id', 'title', 'anonymous', 'status',
      ]
    }

    async toExternal(question) {

      if (util.type(question.content) !== 'string') {
        question = await this.getFullQuestionById(question)
      }

      const result = { }
      Object.assign(result, question)

      const { id, number, user_id, anonymous } = result
      delete result.number
      delete result.user_id
      delete result.anonymous

      result.id = number

      const { account, trace } = this.service

      const currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        result.has_like = await trace.like.hasLikeQuestion(id, currentUser.id)
        result.has_follow = await trace.follow.hasFollowQuestion(id, currentUser.id)

        if (currentUser.id === user_id) {
          result.can_update = true
          const subCount = await this.getQuestionSubCount(id)
          result.can_delete = subCount === 0
        }
      }

      if (anonymous === limit.ANONYMOUS_YES) {
        result.user = account.user.anonymous
      }
      else {
        const user = await account.user.getFullUserById(user_id)
        result.user = await account.user.toExternal(user)
      }

      result.create_time = result.create_time.getTime()
      result.update_time = result.update_time.getTime()

      return result

    }

    /**
     * 检查问题是否是对外可用状态
     *
     * @param {number|Object} questionId 问题 id
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkQuestionAvailableById(questionId, checkStatus) {

      let question
      if (questionId && questionId.id) {
        question = questionId
        questionId = question.id
      }

      if (!question && questionId) {
        question = await this.getQuestionById(questionId)
      }

      if (question
        && (!checkStatus
        || question.status === STATUS_ACTIVE
        || question.status === STATUS_AUDIT_SUCCESS)
      ) {
        return question
      }

      this.throw(
        code.RESOURCE_NOT_FOUND,
        '该问题不存在'
      )

    }

    /**
     * 检查问题是否是对外可用状态
     *
     * @param {number} replyNumber 问题 number
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkQuestionAvailableByNumber(questionNumber, checkStatus) {

      const question = await this.findOneBy({
        number: questionNumber,
      })

      return await this.checkQuestionAvailableById(question, checkStatus)

    }

    /**
     * 获取 id 获取问题
     *
     * @param {number|Object} questionId
     * @return {Object}
     */
    async getQuestionById(questionId) {

      let question
      if (questionId && questionId.id) {
        question = questionId
        questionId = question.id
      }

      if (!question) {
        const key = `question:${questionId}`
        const value = await redis.get(key)

        if (value) {
          question = util.parseObject(value)
        }
        else {
          question = await this.findOneBy({ id: questionId })
          await redis.set(key, util.stringifyObject(question))
        }
      }

      return question
    }

    /**
     * 获取问题的完整信息
     *
     * @param {number|Object} questionId
     * @return {Object}
     */
    async getFullQuestionById(questionId) {

      const { qa } = this.ctx.service

      const question = await this.getQuestionById(questionId)
      const questionContent = await qa.questionContent.findOneBy({
        question_id: question.id,
      })

      question.content = questionContent.content
      if (questionContent.update_time.getTime() > question.update_time.getTime()) {
        question.update_time = questionContent.update_time
      }

      question.sub_count = await this.getQuestionSubCount(question.id)
      question.view_count = await this.getQuestionViewCount(question.id)
      question.like_count = await this.getQuestionLikeCount(question.id)
      question.follow_count = await this.getQuestionFollowCount(question.id)

      return question

    }

    /**
     * 新建问题
     *
     * @param {Object} data
     * @property {string} data.title
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @return {number} 新建的 question id
     */
    async createQuestion(data) {

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

      const { account, qa, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const questionId = await this.transaction(
        async () => {

          const number = await this.createNumber(limit.QUESTION_NUMBER_LENGTH)
          const anonymous = data.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO
          const questionId = await this.insert({
            number,
            title: data.title,
            user_id: currentUser.id,
            anonymous,
          })

          await qa.questionContent.insert({
            question_id: questionId,
            content: data.content,
          })

          await trace.create.createQuestion(questionId, anonymous)

          return questionId

        }
      )

      if (questionId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '新增问题失败'
        )
      }

      eventEmitter.emit(
        eventEmitter.QUESTION_CREATE,
        {
          questionId,
          service: this.service,
        }
      )

      return questionId

    }

    /**
     * 修改问题
     *
     * @param {Object} data
     * @property {string} data.title
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @param {number|Object} questionId
     */
    async updateQuestionById(data, questionId) {

      const { account, qa, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const question = await this.getQuestionById(questionId)

      if (question.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '没有权限修改该问题'
        )
      }

      let fields = this.getFields(data)

      const { content } = data

      await this.transaction(
        async () => {

          if (fields) {
            if ('anonymous' in fields) {
              fields.anonymous = fields.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO
              if (fields.anonymous === question.anonymous) {
                delete fields.anonymous
              }
            }
            if (Object.keys(fields).length) {
              await this.update(
                fields,
                {
                  id: question.id,
                }
              )
            }
            else {
              fields = null
            }
          }

          if (content) {
            await qa.questionContent.update(
              {
                content,
              },
              {
                question_id: question.id,
              }
            )
          }

          if (fields && 'anonymous' in fields) {
            await trace.create.createQuestion(questionId, fields.anonymous)
          }

        }
      )

      if (fields && content) {

        await this.updateRedis(`question:${question.id}`, fields)

        eventEmitter.emit(
          eventEmitter.QUESTION_UPDATE,
          {
            questionId: question.id,
            service: this.service,
          }
        )
      }

    }

    /**
     * 删除问题
     *
     * @param {number|Object} questionId
     */
    async deleteQuestion(questionId) {

      const { account, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const question = await this.getQuestionById(questionId)

      if (question.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '不能删除别人的问题'
        )
      }

      const subCount = await this.getQuestionSubCount(question.id)
      if (subCount > 0) {
        this.throw(
          code.PERMISSION_DENIED,
          '已有回复的问题不能删除'
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
              id: question.id,
            }
          )

          await trace.create.uncreateQuestion(question.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '删除问题失败'
        )
      }

      await this.updateRedis(`question:${question.id}`, fields)

      eventEmitter.emit(
        eventEmitter.QUESTION_UPDATE,
        {
          questionId: question.id,
          service: this.service,
        }
      )

    }

    /**
     * 浏览问题
     *
     * @param {number|Object} questionId
     * @return {Object}
     */
    async viewQuestion(questionId) {

      if (!config.questionViewByGuest) {
        const { account } = this.service
        const currentUser = await account.session.getCurrentUser()
        if (!currentUser) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览问题'
          )
        }
      }

      const question = await this.getQuestionById(questionId)

      return await this.getFullQuestionById(question)

    }

    /**
     * 获得问题列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getQuestionList(where, options) {
      this._formatWhere(where)
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获得问题数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getQuestionCount(where) {
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
     * 递增问题的被点赞量
     *
     * @param {number} questionId
     */
    async increaseQuestionLikeCount(questionId) {
      const key = `question_stat:${questionId}`
      const likeCount = await redis.hget(key, 'like_count')
      if (likeCount != null) {
        await redis.hincrby(key, 'like_count', 1)
      }
    }

    /**
     * 递减问题的被点赞量
     *
     * @param {number} questionId
     */
    async decreaseQuestionLikeCount(questionId) {
      const key = `question_stat:${questionId}`
      const likeCount = await redis.hget(key, 'like_count')
      if (likeCount != null) {
        await redis.hincrby(key, 'like_count', -1)
      }
    }

    /**
     * 获取问题的被点赞量
     *
     * @param {number} questionId
     * @return {number}
     */
    async getQuestionLikeCount(questionId) {
      const key = `question_stat:${questionId}`
      let likeCount = await redis.hget(key, 'like_count')
      if (likeCount == null) {
        likeCount = await this.service.trace.like.getLikeQuestionCount(questionId)
        await redis.hset(key, 'like_count', likeCount)
      }
      else {
        likeCount = util.toNumber(likeCount, 0)
      }
      return likeCount
    }

    /**
     * 递增问题的关注量
     *
     * @param {number} questionId
     */
    async increaseQuestionFollowCount(questionId) {
      const key = `question_stat:${questionId}`
      const followCount = await redis.hget(key, 'follow_count')
      if (followCount != null) {
        await redis.hincrby(key, 'follow_count', 1)
      }
    }

    /**
     * 递减问题的关注量
     *
     * @param {number} questionId
     */
    async decreaseQuestionFollowCount(questionId) {
      const key = `question_stat:${questionId}`
      const followCount = await redis.hget(key, 'follow_count')
      if (followCount != null) {
        await redis.hincrby(key, 'follow_count', -1)
      }
    }

    /**
     * 获取问题的关注量
     *
     * @param {number} questionId
     * @return {number}
     */
    async getQuestionFollowCount(questionId) {
      const key = `question_stat:${questionId}`
      let followCount = await redis.hget(key, 'follow_count')
      if (followCount == null) {
        followCount = await this.service.trace.follow.getFollowQuestionCount(questionId)
        await redis.hset(key, 'follow_count', followCount)
      }
      else {
        followCount = util.toNumber(followCount, 0)
      }
      return followCount
    }

    /**
     * 递增问题的浏览量
     *
     * @param {number} questionId
     */
    async increaseQuestionViewCount(questionId) {
      // [TODO]这里不管有没有，必须递增
      // 因为靠数据库恢复不了
      await redis.hincrby(`question_stat:${questionId}`, 'view_count', 1)
    }

    /**
     * 获取问题的浏览量
     *
     * @param {number} questionId
     * @return {number}
     */
    async getQuestionViewCount(questionId) {
      // 这里不管有没有，必须读 redis
      // 因为靠数据库恢复不了
      let viewCount = await redis.hget(`question_stat:${questionId}`, 'view_count')
      return util.toNumber(viewCount, 0)
    }

    /**
     * 递增问题的回复量
     *
     * @param {number} questionId
     */
    async increaseQuestionSubCount(questionId) {
      const key = `question_stat:${questionId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', 1)
      }
    }

    /**
     * 递减问题的回复量
     *
     * @param {number} questionId
     */
    async decreaseQuestionSubCount(questionId) {
      const key = `question_stat:${questionId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', -1)
      }
    }

    /**
     * 获取问题的回复量
     *
     * @param {number} questionId
     * @return {number}
     */
    async getQuestionSubCount(questionId) {
      const key = `question_stat:${questionId}`
      let subCount = await redis.hget(key, 'sub_count')
      if (subCount == null) {
        subCount = await this.service.qa.reply.getReplyCount({
          question_id: questionId,
          parent_id: 0,
        })
        await redis.hset(key, 'sub_count', subCount)
      }
      else {
        subCount = util.toNumber(subCount, 0)
      }
      return subCount
    }

  }
  return Question
}
