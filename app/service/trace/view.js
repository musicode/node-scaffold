
'use strict'

const TYPE_QUESTION = 1
const TYPE_DEMAND = 2
const TYPE_POST = 3
const TYPE_USER = 4

const STATUS_ACTIVE = 0
const STATUS_DELETED = 1

module.exports = app => {

  const { code, util, } = app

  class View extends app.BaseService {

    get tableName() {
      return 'trace_view'
    }

    get fields() {
      return [
        'resource_id', 'resource_type',
        'creator_id', 'anonymous', 'status',
      ]
    }

    /**
     * 浏览
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     */
    async _addView(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const record = await this.findOneBy({
        resource_id: data.resource_id,
        resource_type: data.resource_type,
        creator_id: currentUser.id,
      })

      if (record) {
        if (record.status !== STATUS_ACTIVE) {
          await this.update(
            {
              status: STATUS_ACTIVE,
            },
            {
              id: record.id,
            }
          )
          return record.id
        }
      }
      else {
        data.creator_id = currentUser.id
        return await this.insert(data)
      }

    }

    /**
     * 浏览文章
     *
     * @param {number|Object} postId
     */
    async viewPost(postId) {

      const { account, trace, article } = this.service

      const post = await article.post.getPostById(postId)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addView({
            resource_id: post.id,
            resource_type: TYPE_POST,
          })

          let record

          if (util.type(traceId) === 'object') {
            record = traceId
            traceId = record.id
          }
          else if (traceId) {
            record = await this.findOneBy({
              id: traceId,
            })
          }

          if (record) {
            await trace.viewRemind.addViewRemind({
              trace_id: traceId,
              resource_type: record.resource_type,
              sender_id: record.creator_id,
              receiver_id: post.user_id,
            })
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '浏览失败'
        )
      }

      await article.post.increasePostViewCount(post.id)

    }

    /**
     * 用户是否已浏览文章
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {boolean}
     */
    async hasViewPost(creatorId, postId) {

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: creatorId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户浏览文章是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {boolean}
     */
    async hasViewPostRemind(creatorId, postId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: postId,
        resource_type: TYPE_POST,
        creator_id: creatorId,
      })

      if (record) {
        return await trace.viewRemind.hasViewRemind(record.id)
      }

      return false

    }

    /**
     * 读取文章的浏览数
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {number}
     */
    async getViewPostCount(creatorId, postId) {
      const where = {
        resource_type: TYPE_POST,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (postId) {
        where.resource_id = postId
      }
      return await this.countBy(where)
    }

    /**
     * 获取文章的浏览列表
     *
     * @param {number} creatorId
     * @param {number} postId
     * @param {Object} options
     * @return {Array}
     */
    async getViewPostList(creatorId, postId, options) {
      const where = {
        resource_type: TYPE_POST,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (postId) {
        where.resource_id = postId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被浏览文章的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getViewPostRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_POST,
        },
        options
      )
    }

    /**
     * 获取用户被浏览文章的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewPostRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 获取用户被浏览文章的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewPostUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getUnreadViewRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_POST,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readViewPostRemind(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.readViewRemind({
        receiver_id: receiverId,
        resource_type: TYPE_POST,
      })
    }



    /**
     * 浏览项目
     *
     * @param {number|Object} demandId
     */
    async viewDemand(demandId) {

      const { account, trace, project } = this.service

      const demand = await project.demand.getDemandById(demandId)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addView({
            resource_id: demand.id,
            resource_type: TYPE_DEMAND,
          })

          let record

          if (util.type(traceId) === 'object') {
            record = traceId
            traceId = record.id
          }
          else if (traceId) {
            record = await this.findOneBy({
              id: traceId,
            })
          }

          if (record) {
            await trace.viewRemind.addViewRemind({
              trace_id: traceId,
              resource_type: record.resource_type,
              sender_id: record.creator_id,
              receiver_id: demand.user_id,
            })
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '浏览失败'
        )
      }

      await project.demand.increaseDemandViewCount(demand.id)

    }

    /**
     * 用户是否已浏览项目
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @return {boolean}
     */
    async hasViewDemand(creatorId, demandId) {

      const record = await this.findOneBy({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
        creator_id: creatorId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户浏览项目是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @return {boolean}
     */
    async hasViewDemandRemind(creatorId, demandId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: demandId,
        resource_type: TYPE_DEMAND,
        creator_id: creatorId,
      })

      if (record) {
        return await trace.viewRemind.hasViewRemind(record.id)
      }

      return false

    }

    /**
     * 读取项目的浏览数
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @return {number}
     */
    async getViewDemandCount(creatorId, demandId) {
      const where = {
        resource_type: TYPE_DEMAND,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (demandId) {
        where.resource_id = demandId
      }
      return await this.countBy(where)
    }

    /**
     * 获取项目的浏览列表
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @param {Object} options
     * @return {Array}
     */
    async getViewDemandList(creatorId, demandId, options) {
      const where = {
        resource_type: TYPE_DEMAND,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (demandId) {
        where.resource_id = demandId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被浏览项目的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getViewDemandRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_DEMAND,
        },
        options
      )
    }

    /**
     * 获取用户被浏览项目的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewDemandRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 获取用户被浏览项目的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewDemandUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getUnreadViewRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_DEMAND,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readViewDemandRemind(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.readViewRemind({
        receiver_id: receiverId,
        resource_type: TYPE_DEMAND,
      })
    }






    /**
     * 浏览问题
     *
     * @param {number|Object} questionId
     */
    async viewQuestion(questionId) {

      const { account, trace, qa } = this.service

      const question = await qa.question.getQuestionById(questionId)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addView({
            resource_id: question.id,
            resource_type: TYPE_QUESTION,
          })

          let record

          if (util.type(traceId) === 'object') {
            record = traceId
            traceId = record.id
          }
          else if (traceId) {
            record = await this.findOneBy({
              id: traceId,
            })
          }

          if (record) {
            await trace.viewRemind.addViewRemind({
              trace_id: traceId,
              resource_type: record.resource_type,
              sender_id: record.creator_id,
              receiver_id: question.user_id,
            })
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '浏览失败'
        )
      }

      await qa.question.increaseQuestionViewCount(question.id)

    }

    /**
     * 用户是否已浏览问题
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @return {boolean}
     */
    async hasViewQuestion(creatorId, questionId) {

      const record = await this.findOneBy({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
        creator_id: creatorId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户浏览问题是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @return {boolean}
     */
    async hasViewQuestionRemind(creatorId, questionId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
        creator_id: creatorId,
      })

      if (record) {
        return await trace.viewRemind.hasViewRemind(record.id)
      }

      return false

    }

    /**
     * 读取问题的浏览数
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @return {number}
     */
    async getViewQuestionCount(creatorId, questionId) {
      const where = {
        resource_type: TYPE_QUESTION,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (questionId) {
        where.resource_id = questionId
      }
      return await this.countBy(where)
    }

    /**
     * 获取问题的浏览列表
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @param {Object} options
     * @return {Array}
     */
    async getViewQuestionList(creatorId, questionId, options) {
      const where = {
        resource_type: TYPE_QUESTION,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (questionId) {
        where.resource_id = questionId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被浏览问题的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getViewQuestionRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_QUESTION,
        },
        options
      )
    }

    /**
     * 获取用户被浏览问题的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewQuestionRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 获取用户被浏览问题的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewQuestionUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getUnreadViewRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readViewQuestionRemind(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.readViewRemind({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }





    /**
     * 浏览用户
     *
     * @param {number|Object} userId
     */
    async viewUser(userId) {

      const { account, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()
      const user = await account.user.getUserById(userId)

      await account.user.checkViewAvailable(currentUser.id, user.id)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addView({
            resource_id: user.id,
            resource_type: TYPE_USER,
          })

          let record

          if (util.type(traceId) === 'object') {
            record = traceId
            traceId = record.id
          }
          else if (traceId) {
            record = await this.findOneBy({
              id: traceId,
            })
          }

          if (record) {
            await trace.viewRemind.addViewRemind({
              trace_id: traceId,
              resource_type: record.resource_type,
              sender_id: record.creator_id,
              receiver_id: user.user_id,
            })
          }

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '浏览失败'
        )
      }

      await account.user.increaseUserViewCount(user.id)

    }

    /**
     * 用户是否已浏览用户
     *
     * @param {number} creatorId
     * @param {number} userId
     * @return {boolean}
     */
    async hasViewUser(creatorId, userId) {

      const record = await this.findOneBy({
        resource_id: userId,
        resource_type: TYPE_USER,
        creator_id: creatorId,
        status: STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户浏览用户是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} userId
     * @return {boolean}
     */
    async hasViewUserRemind(creatorId, userId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: userId,
        resource_type: TYPE_USER,
        creator_id: creatorId,
      })

      if (record) {
        return await trace.viewRemind.hasViewRemind(record.id)
      }

      return false

    }

    /**
     * 读取用户的浏览数
     *
     * @param {number} creatorId
     * @param {number} userId
     * @return {number}
     */
    async getViewUserCount(creatorId, userId) {
      const where = {
        resource_type: TYPE_USER,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (userId) {
        where.resource_id = userId
      }
      return await this.countBy(where)
    }

    /**
     * 获取用户的浏览列表
     *
     * @param {number} creatorId
     * @param {number} userId
     * @param {Object} options
     * @return {Array}
     */
    async getViewUserList(creatorId, userId, options) {
      const where = {
        resource_type: TYPE_USER,
        status: STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (userId) {
        where.resource_id = userId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被浏览用户的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getViewUserRemindList(receiverId, options) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_USER,
        },
        options
      )
    }

    /**
     * 获取用户被浏览用户的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewUserRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getViewRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_USER,
      })
    }

    /**
     * 获取用户被浏览用户的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getViewUserUnreadRemindCount(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.getUnreadViewRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_USER,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readViewUserRemind(receiverId) {
      const { trace } = this.service
      return await trace.viewRemind.readViewRemind({
        receiver_id: receiverId,
        resource_type: TYPE_USER,
      })
    }

  }
  return View
}
