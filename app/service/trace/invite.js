'use strict'

const TYPE_QUESTION = 1

const STATUS_IGNORED = 2

const BaseTraceService = require('./base')

module.exports = app => {

  const { code, util, } = app

  class Invite extends BaseTraceService {

    get STATUS_IGNORED() {
      return STATUS_IGNORED
    }

    get tableName() {
      return 'trace_invite'
    }

    get fields() {
      return [
        'resource_id', 'resource_type', 'user_id',
        'creator_id', 'anonymous', 'status',
      ]
    }

    get remindService() {
      return this.service.trace.inviteRemind
    }

    async toExternal(invite) {

      const { account, qa } = this.service
      const { resource_id, creator_id, user_id } = invite

      const resource = await qa.question.getFullQuestionById(resource_id)

      const creator = await account.user.getFullUserById(creator_id)

      const user = await account.user.getFullUserById(user_id)

      return {
        id: invite.id,
        type: 'question',
        resource: await qa.question.toExternal(resource),
        creator: await account.user.toExternal(creator),
        user: await account.user.toExternal(user),
        create_time: invite.create_time.getTime(),
      }
    }

    /**
     * 邀请
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     * @property {string} data.user_id
     */
    async _addInvite(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const record = await this.findOneBy({
        resource_id: data.resource_id,
        resource_type: data.resource_type,
        creator_id: currentUser.id,
        user_id: data.user_id,
      })

      if (record) {
        if (record.status === this.STATUS_ACTIVE) {
          this.throw(
            code.RESOURCE_EXISTS,
            '已邀请，不能再次邀请'
          )
        }
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
      else {
        data.creator_id = currentUser.id
        return await this.insert(data)
      }

    }

    /**
     * 取消邀请
     *
     * @param {Object} data
     * @property {string} data.resource_id
     * @property {string} data.resource_type
     * @property {string} data.user_id
     * @return {Object}
     */
    async _removeInvite(data) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const record = await this.findOneBy({
        resource_id: data.resource_id,
        resource_type: data.resource_type,
        creator_id: currentUser.id,
        user_id: data.user_id,
      })

      if (!record || record.status === this.STATUS_DELETED) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '未邀请，不能取消邀请'
        )
      }

      await this.update(
        {
          status: this.STATUS_DELETED,
        },
        {
          id: record.id,
        }
      )

      return record

    }



    /**
     * 邀请回答问题
     *
     * @param {number|Object} userId 邀请的用户
     * @param {number|Object} questionId 问题
     */
    async inviteQuestion(userId, questionId) {

      const { account, trace, qa } = this.service

      const question = await qa.question.checkQuestionAvailableById(questionId, true)
      const user = await account.user.checkUserAvailableById(userId, true)

      const isSuccess = await this.transaction(
        async () => {

          let traceId = await this._addInvite({
            resource_id: question.id,
            resource_type: TYPE_QUESTION,
            user_id: user.id,
          })

          let record

          if (util.type(traceId) === 'object') {
            record = traceId
            traceId = record.id
          }
          else {
            record = await this.findOneBy({
              id: traceId,
            })
          }

          await trace.inviteRemind.addInviteRemind({
            trace_id: traceId,
            resource_type: record.resource_type,
            sender_id: record.creator_id,
            receiver_id: user.id,
          })

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_INSERT_ERROR,
          '邀请失败'
        )
      }

    }

    /**
     * 取消邀请回答问题
     *
     * @param {number|Object} userId 邀请的用户
     * @param {number|Object} questionId
     */
    async uninviteQuestion(userId, questionId) {

      const { account, trace, qa } = this.service

      const question = await qa.question.checkQuestionAvailableById(questionId)
      const user = await account.user.checkUserAvailableById(userId, true)

      const isSuccess = await this.transaction(
        async () => {

          const record = await this._removeInvite({
            resource_id: question.id,
            resource_type: TYPE_QUESTION,
            user_id: user.id,
          })

          await trace.inviteRemind.removeInviteRemind(record.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '取消邀请失败'
        )
      }

    }

    /**
     * 忽略邀请回答问题
     *
     * @param {number|Object} creatorId 发起人
     * @param {number|Object} questionId
     */
    async ignoreQuestion(creatorId, questionId) {

      const { account, trace, qa } = this.service

      const question = await qa.question.checkQuestionAvailableById(questionId)
      const creator = await account.user.checkUserAvailableById(creatorId, true)

      const currentUser = await account.session.checkCurrentUser()

      const isSuccess = await this.transaction(
        async () => {

          const record = await this.findOneBy({
            resource_id: question.id,
            resource_type: TYPE_QUESTION,
            creator_id: creator.id,
            user_id: currentUser.id,
          })

          await this.update(
            {
              status: this.STATUS_IGNORED,
            },
            {
              id: record.id,
            }
          )

          await trace.inviteRemind.removeInviteRemind(record.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '忽略邀请失败'
        )
      }

    }

    /**
     * 用户是否已邀请回答问题
     *
     * @param {number} creatorId
     * @param {number} userId
     * @param {number} questionId
     * @return {boolean}
     */
    async hasInviteQuestion(creatorId, userId, questionId) {

      const record = await this.findOneBy({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
        creator_id: creatorId,
        user_id: userId,
        status: this.STATUS_ACTIVE,
      })

      return record ? true : false

    }

    /**
     * 用户邀请回答问题是否已提醒作者
     *
     * @param {number} creatorId
     * @param {number} userId
     * @param {number} questionId
     * @return {boolean}
     */
    async hasInviteQuestionRemind(creatorId, userId, questionId) {

      const { trace } = this.service

      const record = await this.findOneBy({
        resource_id: questionId,
        resource_type: TYPE_QUESTION,
        creator_id: creatorId,
        user_id: userId,
      })

      if (record) {
        return await trace.inviteRemind.hasInviteRemind(record.id)
      }

      return false

    }

    /**
     * 读取回答问题的邀请数
     *
     * @param {number} creatorId
     * @param {number} userId
     * @param {number} questionId
     * @return {number}
     */
    async getInviteQuestionCount(creatorId, userId, questionId) {
      const where = {
        resource_type: TYPE_QUESTION,
        status: this.STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (userId) {
        where.user_id = userId
      }
      if (questionId) {
        where.resource_id = questionId
      }
      return await this.countBy(where)
    }

    /**
     * 获取回答问题的邀请列表
     *
     * @param {number} creatorId
     * @param {number} userId
     * @param {number} questionId
     * @param {Object} options
     * @return {Array}
     */
    async getInviteQuestionList(creatorId, userId, questionId, options) {
      const where = {
        resource_type: TYPE_QUESTION,
        status: this.STATUS_ACTIVE,
      }
      if (creatorId) {
        where.creator_id = creatorId
      }
      if (userId) {
        where.user_id = userId
      }
      if (questionId) {
        where.resource_id = questionId
      }
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获取用户被邀请回答问题的提醒列表
     *
     * @param {number} receiverId
     * @param {Object} options
     * @return {Array}
     */
    async getInviteQuestionRemindList(receiverId, options) {
      return await this.remindService.getInviteRemindList(
        {
          receiver_id: receiverId,
          resource_type: TYPE_QUESTION,
        },
        options
      )
    }

    /**
     * 获取用户被邀请回答问题的提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getInviteQuestionRemindCount(receiverId) {
      return await this.remindService.getInviteRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 获取用户被邀请回答问题的未读提醒数量
     *
     * @param {number} receiverId
     * @return {number}
     */
    async getInviteQuestionUnreadRemindCount(receiverId) {
      return await this.remindService.getUnreadInviteRemindCount({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }

    /**
     * 标记已读
     *
     * @param {number} receiverId
     */
    async readInviteQuestionRemind(receiverId) {
      return await this.remindService.readInviteRemind({
        receiver_id: receiverId,
        resource_type: TYPE_QUESTION,
      })
    }
  }
  return Invite
}