
'use strict'

const TYPE_QUESTION = 1
const TYPE_DEMAND = 2
const TYPE_POST = 3
const TYPE_USER = 4

const BaseTraceService = require('./base')

module.exports = app => {

  const { code, util, } = app

  class View extends BaseTraceService {

    get tableName() {
      return 'trace_view'
    }

    get fields() {
      return [
        'resource_id', 'resource_type',
        'creator_id', 'anonymous', 'status',
      ]
    }

    get remindService() {
      return this.service.trace.viewRemind
    }

    async toExternal(view) {

      const { account, article, project, qa } = this.service
      const { resource_id, resource_type, creator_id } = view

      let type, resource
      if (resource_type == TYPE_QUESTION) {
        type = 'question'
        resource = await qa.question.getFullQuestionById(resource_id)
        resource = await qa.question.toExternal(resource)
      }
      else if (resource_type == TYPE_DEMAND) {
        type = 'demand'
        resource = await project.demand.getFullDemandById(resource_id)
        resource = await project.demand.toExternal(resource)
      }
      else if (resource_type == TYPE_POST) {
        type = 'post'
        resource = await article.post.getFullPostById(resource_id)
        resource = await article.post.toExternal(resource)
      }
      else if (resource_type == TYPE_USER) {
        type = 'user'
        resource = await account.user.getFullUserById(resource_id)
        resource = await account.user.toExternal(resource)
      }

      let creator = await account.user.getFullUserById(creator_id)
      creator = await account.user.toExternal(creator)

      return {
        id: view.id,
        type,
        resource,
        creator,
        create_time: view.create_time.getTime(),
      }

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
        if (record.status !== this.STATUS_ACTIVE) {
          await this.update(
            {
              status: this.STATUS_ACTIVE,
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
      return await this.hasTrace(creatorId, postId, TYPE_POST)
    }

    /**
     * 用户浏览文章是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {boolean}
     */
    async hasViewPostRemind(creatorId, postId) {
      return await this.hasTraceRemind(creatorId, postId, TYPE_POST)
    }

    /**
     * 读取文章的浏览数
     *
     * @param {number} creatorId
     * @param {number} postId
     * @return {number}
     */
    async getViewPostCount(creatorId, postId) {
      return await this.getTraceCount(creatorId, postId, TYPE_POST)
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
      return await this.getTraceList(creatorId, postId, TYPE_POST, options)
    }

    /**
     * 获取用户被浏览文章的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getViewPostRemindList(receiverId, options) {
      return await this.remindService.getViewRemindList(
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
      return await this.remindService.getViewRemindCount({
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
      return await this.remindService.getUnreadViewRemindCount({
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
      return await this.remindService.readViewRemind({
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
      return await this.hasTrace(creatorId, demandId, TYPE_DEMAND)
    }

    /**
     * 用户浏览项目是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @return {boolean}
     */
    async hasViewDemandRemind(creatorId, demandId) {
      return await this.hasTraceRemind(creatorId, demandId, TYPE_DEMAND)
    }

    /**
     * 读取项目的浏览数
     *
     * @param {number} creatorId
     * @param {number} demandId
     * @return {number}
     */
    async getViewDemandCount(creatorId, demandId) {
      return await this.getTraceCount(creatorId, demandId, TYPE_DEMAND)
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
      return await this.getTraceList(creatorId, demandId, TYPE_DEMAND, options)
    }

    /**
     * 获取用户被浏览项目的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getViewDemandRemindList(receiverId, options) {
      return await this.remindService.getViewRemindList(
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
      return await this.remindService.getViewRemindCount({
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
      return await this.remindService.getUnreadViewRemindCount({
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
      return await this.remindService.readViewRemind({
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
      return await this.hasTrace(creatorId, questionId, TYPE_QUESTION)
    }

    /**
     * 用户浏览问题是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @return {boolean}
     */
    async hasViewQuestionRemind(creatorId, questionId) {
      return await this.hasTraceRemind(creatorId, questionId, TYPE_QUESTION)
    }

    /**
     * 读取问题的浏览数
     *
     * @param {number} creatorId
     * @param {number} questionId
     * @return {number}
     */
    async getViewQuestionCount(creatorId, questionId) {
      return await this.getTraceCount(creatorId, questionId, TYPE_QUESTION)
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
      return await this.getTraceCount(creatorId, questionId, TYPE_QUESTION, options)
    }

    /**
     * 获取用户被浏览问题的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getViewQuestionRemindList(receiverId, options) {
      return await this.remindService.getViewRemindList(
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
      return await this.remindService.getViewRemindCount({
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
      return await this.remindService.getUnreadViewRemindCount({
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
      return await this.remindService.readViewRemind({
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
              receiver_id: user.id,
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
      return await this.hasTrace(creatorId, userId, TYPE_USER)
    }

    /**
     * 用户浏览用户是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} userId
     * @return {boolean}
     */
    async hasViewUserRemind(creatorId, userId) {
      return await this.hasTraceRemind(creatorId, userId, TYPE_USER)
    }

    /**
     * 读取用户的浏览数
     *
     * @param {number} creatorId
     * @param {number} userId
     * @return {number}
     */
    async getViewUserCount(creatorId, userId) {
      return await this.getTraceCount(creatorId, userId, TYPE_USER)
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
      return await this.getTraceList(creatorId, userId, TYPE_USER, options)
    }

    /**
     * 获取用户被浏览用户的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getViewUserRemindList(receiverId, options) {
      return await this.remindService.getViewRemindList(
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
      return await this.remindService.getViewRemindCount({
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
      return await this.remindService.getUnreadViewRemindCount({
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
      return await this.remindService.readViewRemind({
        receiver_id: receiverId,
        resource_type: TYPE_USER,
      })
    }

  }
  return View
}
