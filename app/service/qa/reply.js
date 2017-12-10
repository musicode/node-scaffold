
'use strict'

const STATUS_ACTIVE = 0
const STATUS_AUDIT_SUCCESS = 1
const STATUS_AUDIT_FAIL = 2
const STATUS_DELETED = 3

module.exports = app => {

  const { code, util, limit, redis, config, eventEmitter } = app

  class Reply extends app.BaseService {

    get tableName() {
      return 'qa_reply'
    }

    get fields() {
      return [
        'number', 'user_id', 'question_id', 'root_id', 'parent_id', 'anonymous', 'status',
      ]
    }

    async toExternal(reply) {

      if (!('content' in reply)) {
        reply = await this.getFullReplyById(reply)
      }

      const result = { }
      Object.assign(result, reply)

      const { id, number, user_id, question_id, root_id, parent_id, anonymous } = result
      delete result.number
      delete result.user_id
      delete result.question_id
      delete result.root_id
      delete result.parent_id
      delete result.anonymous

      result.id = number

      const { account, qa, trace, } = this.service

      const currentUser = await account.session.getCurrentUser()
      if (currentUser) {

        result.has_like = await trace.like.hasLikeReply(currentUser.id, id)
        result.has_follow = await trace.follow.hasFollowReply(currentUser.id, id)

        if (currentUser.id === user_id) {
          result.can_update = true
          const subCount = await this.getReplySubCount(id)
          result.can_delete = subCount === 0
        }
      }

      if (root_id) {
        const rootReply = await this.getReplyById(root_id)
        result.root_id = rootReply.number
      }

      if (anonymous === limit.ANONYMOUS_YES) {
        result.user = account.user.anonymous
      }
      else {
        const user = await account.user.getFullUserById(user_id)
        result.user = await account.user.toExternal(user)
      }

      if (parent_id && parent_id !== root_id) {
        const parentReply = await this.getReplyById(parent_id)
        result.parent_id = parentReply.number

        if (parentReply.anonymous === limit.ANONYMOUS_YES) {
          result.parent_user = account.user.anonymous
        }
        else {
          const parentUser = await account.user.getFullUserById(parentReply.user_id)
          result.parent_user = await account.user.toExternal(parentUser)
        }
      }

      const question = await qa.question.getFullQuestionById(question_id)
      result.question = await qa.question.toExternal(question)

      result.create_time = result.create_time.getTime()
      result.update_time = result.update_time.getTime()

      return result

    }

    /**
     * 检查回复是否是对外可用状态
     *
     * @param {number|Object} replyId 回复 id
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkReplyAvailableById(replyId, checkStatus) {

      let reply
      if (replyId && replyId.id) {
        reply = replyId
        replyId = reply.id
      }

      if (!reply && replyId) {
        reply = await this.getReplyById(replyId)
      }

      if (reply
        && (!checkStatus
        || reply.status === STATUS_ACTIVE
        || reply.status === STATUS_AUDIT_SUCCESS)
      ) {
        return reply
      }

      this.throw(
        code.RESOURCE_NOT_FOUND,
        '该回复不存在'
      )

    }

    /**
     * 检查回复是否是对外可用状态
     *
     * @param {number} replyNumber 回复 number
     * @param {boolean} checkStatus 是否检查状态值
     * @return {Object}
     */
    async checkReplyAvailableByNumber(replyNumber, checkStatus) {

      const reply = await this.findOneBy({
        number: replyNumber,
      })

      return await this.checkReplyAvailableById(reply, checkStatus)

    }

    /**
     * 通过 id 获取回复
     *
     * @param {number|Object} replyId
     * @return {Object}
     */
    async getReplyById(replyId) {

      let reply
      if (replyId && replyId.id) {
        reply = replyId
        replyId = reply.id
      }

      if (!reply) {
        const key = `reply:${replyId}`
        const value = await redis.get(key)

        if (value) {
          reply = util.parseObject(value)
        }
        else {
          reply = await this.findOneBy({ id: replyId })
          await redis.set(key, util.stringifyObject(reply))
        }
      }

      return reply

    }

    /**
     * 获取回复的完整信息
     *
     * @param {number|Object} replyId
     * @return {Object}
     */
    async getFullReplyById(replyId) {

      const { qa } = this.ctx.service

      const reply = await this.getReplyById(replyId)

      const record = await qa.replyContent.findOneBy({
        reply_id: reply.id,
      })

      reply.like_count = await this.getReplyLikeCount(reply.id)
      reply.follow_count = await this.getReplyFollowCount(reply.id)
      reply.sub_count = await this.getReplySubCount(reply.id)

      reply.content = record.content
      if (record.update_time.getTime() > reply.update_time.getTime()) {
        reply.update_time = record.update_time
      }

      return reply

    }

    /**
     * 创建回复
     *
     * @param {Object} data
     * @property {string} data.content
     * @property {number} data.question_id
     * @property {number} data.root_id
     * @property {number} data.parent_id
     * @property {anonymous} data.anonymous
     */
    async createReply(data) {

      const { account, qa, trace } = this.service

      if (!data.question_id && !data.parent_id) {
        this.throw(
          code.PARAM_INVALID,
          'question_id 或 parent_id 必须至少有一个'
        )
      }

      if (!data.content) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 content'
        )
      }

      const currentUser = await account.session.checkCurrentUser();

      const replyId = await this.transaction(
        async () => {

          const number = await this.createNumber(limit.COMMENT_NUMBER_LENGTH)
          const anonymous = data.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO

          const row = {
            number,
            user_id: currentUser.id,
            question_id: data.question_id,
            parent_id: data.parent_id || 0,
            anonymous,
          }

          if (data.root_id) {
            row.root_id = data.root_id
          }

          if (!row.root_id && row.parent_id) {
            this.throw(
              code.PARAM_INVALID,
              '缺少 root_id'
            )
          }

          const replyId = await this.insert(row)

          await qa.replyContent.insert({
            reply_id: replyId,
            content: data.content,
          })

          await trace.create.createReply(replyId, anonymous, data.question_id, data.root_id, data.parent_id)

          return replyId

        }
      )

      if (replyId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '新增回复失败'
        )
      }

      await qa.question.increaseQuestionSubCount(data.question_id)

      if (!data.root_id) {
        await account.user.increaseUserWriteCount(currentUser.id)
      }

      if (data.parent_id) {
        await this.increaseReplySubCount(data.parent_id)
      }

      eventEmitter.emit(
        eventEmitter.REPLY_CREATE,
        {
          replyId,
          service: this.service,
        }
      )

      return replyId

    }


    /**
     * 修改回复
     *
     * @param {Object} data
     * @property {string} data.content
     * @property {boolean|number} data.anonymous
     * @param {number|Object} replyId
     */
    async updateReplyById(data, replyId) {

      const { account, qa, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const reply = await this.getReplyById(replyId)

      if (reply.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '没有权限修改该回复'
        )
      }

      const { content } = data

      let fields = this.getFields(data)

      await this.transaction(
        async () => {

          if (fields) {
            if ('anonymous' in fields) {
              fields.anonymous = fields.anonymous ? limit.ANONYMOUS_YES : limit.ANONYMOUS_NO
              if (fields.anonymous === reply.anonymous) {
                delete fields.anonymous
              }
            }
            if (Object.keys(fields).length) {
              await this.update(
                fields,
                {
                  id: reply.id,
                }
              )
            }
            else {
              fields = null
            }
          }

          if (content) {
            await qa.replyContent.update(
              {
                content,
              },
              {
                reply_id: reply.id,
              }
            )
          }

          if (fields && 'anonymous' in fields) {
            await trace.create.createReply(reply.id, fields.anonymous, reply.question_id, reply.root_id, reply.parent_id)
          }

        }
      )

      if (fields && content) {

        await this.updateRedis(`reply:${reply.id}`, fields)

        eventEmitter.emit(
          eventEmitter.REPLY_UPDATE,
          {
            replyId: reply.id,
            service: this.service,
          }
        )
      }

    }

    /**
     * 删除回复
     *
     * @param {number|Object} replyId
     */
    async deleteReply(replyId) {

      const { account, qa, trace } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const reply = await this.getReplyById(replyId)

      if (reply.user_id !== currentUser.id) {
        this.throw(
          code.PERMISSION_DENIED,
          '不能删除别人的回复'
        )
      }

      const subCount = await this.getReplySubCount(reply.id)
      if (subCount > 0) {
        this.throw(
          code.PERMISSION_DENIED,
          '已有回复的回复不能删除'
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
              id: reply.id,
            }
          )

          await trace.create.uncreateReply(reply.id)

          return true

        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_UPDATE_ERROR,
          '删除回复失败'
        )
      }

      await qa.question.decreaseQuestionSubCount(reply.question_id)

      if (!reply.root_id) {
        await account.user.decreaseUserWriteCount(currentUser.id)
      }

      if (reply.parent_id) {
        await this.decreaseReplySubCount(reply.parent_id)
      }

      await this.updateRedis(`reply:${reply.id}`, fields)

      eventEmitter.emit(
        eventEmitter.REPLY_UPDATE,
        {
          replyId: reply.id,
          service: this.service,
        }
      )

    }

    /**
     * 浏览回复
     *
     * @param {number|Object} replyId
     * @return {Object}
     */
    async viewReply(replyId) {

      if (!config.replyViewByGuest) {
        const { account } = this.service
        const currentUser = await account.session.getCurrentUser()
        if (!currentUser) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览回复'
          )
        }
      }

      const reply = await this.getReplyById(replyId)

      return await this.getFullReplyById(reply)

    }

    /**
     * 获得回复列表
     *
     * @param {Object} where
     * @param {Object} options
     * @return {Array}
     */
    async getReplyList(where, options) {
      this._formatWhere(where)
      options.where = where
      return await this.findBy(options)
    }

    /**
     * 获得回复数量
     *
     * @param {Object} where
     * @return {number}
     */
    async getReplyCount(where) {
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
     * 递增回复的被点赞量
     *
     * @param {number} replyId
     */
    async increaseReplyLikeCount(replyId) {
      const key = `reply_stat:${replyId}`
      const likeCount = await redis.hget(key, 'like_count')
      if (likeCount != null) {
        await redis.hincrby(key, 'like_count', 1)
      }
    }

    /**
     * 递减回复的被点赞量
     *
     * @param {number} replyId
     */
    async decreaseReplyLikeCount(replyId) {
      const key = `reply_stat:${replyId}`
      const likeCount = await redis.hget(key, 'like_count')
      if (likeCount != null) {
        await redis.hincrby(key, 'like_count', -1)
      }
    }

    /**
     * 获取回复的被点赞量
     *
     * @param {number} replyId
     * @return {number}
     */
    async getReplyLikeCount(replyId) {
      const key = `reply_stat:${replyId}`
      let likeCount = await redis.hget(key, 'like_count')
      if (likeCount == null) {
        likeCount = await this.service.trace.like.getLikeReplyCount(null, replyId)
        await redis.hset(key, 'like_count', likeCount)
      }
      else {
        likeCount = util.toNumber(likeCount, 0)
      }
      return likeCount
    }

    /**
     * 递增回复的关注量
     *
     * @param {number} replyId
     */
    async increaseReplyFollowCount(replyId) {
      const key = `reply_stat:${replyId}`
      const followCount = await redis.hget(key, 'follow_count')
      if (followCount != null) {
        await redis.hincrby(key, 'follow_count', 1)
      }
    }

    /**
     * 递减回复的关注量
     *
     * @param {number} replyId
     */
    async decreaseReplyFollowCount(replyId) {
      const key = `reply_stat:${replyId}`
      const followCount = await redis.hget(key, 'follow_count')
      if (followCount != null) {
        await redis.hincrby(key, 'follow_count', -1)
      }
    }

    /**
     * 获取回复的关注量
     *
     * @param {number} replyId
     * @return {number}
     */
    async getReplyFollowCount(replyId) {
      const key = `reply_stat:${replyId}`
      let followCount = await redis.hget(key, 'follow_count')
      if (followCount == null) {
        followCount = await this.service.trace.follow.getFollowReplyCount(null, replyId)
        await redis.hset(key, 'follow_count', followCount)
      }
      else {
        followCount = util.toNumber(followCount, 0)
      }
      return followCount
    }

    /**
     * 递增回复的回复量
     *
     * @param {number} replyId
     */
    async increaseReplySubCount(replyId) {
      const key = `reply_stat:${replyId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', 1)
      }
    }

    /**
     * 递减回复的回复量
     *
     * @param {number} replyId
     */
    async decreaseReplySubCount(replyId) {
      const key = `reply_stat:${replyId}`
      const subCount = await redis.hget(key, 'sub_count')
      if (subCount != null) {
        await redis.hincrby(key, 'sub_count', -1)
      }
    }

    /**
     * 获取回复的回复量
     *
     * @param {number} replyId
     * @return {number}
     */
    async getReplySubCount(replyId) {
      const key = `reply_stat:${replyId}`
      let subCount = await redis.hget(key, 'sub_count')
      if (subCount == null) {
        subCount = await this.getReplyCount({
          parent_id: replyId,
        })
        await redis.hset(key, 'sub_count', subCount)
      }
      else {
        subCount = util.toNumber(subCount, 0)
      }
      return subCount
    }

  }
  return Reply
}
