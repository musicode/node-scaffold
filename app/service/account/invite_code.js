
'use strict'

module.exports = app => {

  const { code, util, limit, config, moment } = app

  class InviteCode extends app.BaseService {

    get tableName() {
      return 'account_invite_code'
    }

    get fields() {
      return [
        'user_id', 'invite_code',
      ]
    }

    /**
     * 通过 invite code id 获取一条邀请码数据
     *
     * @param {number} inviteCodeId
     * @return {Object?}
     */
    async getInviteCodeById(inviteCodeId) {
      return await this.findOneBy({
        id: inviteCodeId,
      })
    }

    /**
     * 新建一个邀请码
     *
     * @return {number}
     */
    async createInviteCode() {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      // 是否还有邀请名额
      const count = await this.countBy({
        user_id: currentUser.id
      })

      if (count >= limit.INVITE_CODE_MAX_COUNT_PER_USER) {
        this.throw(
          code.PERMISSION_DENIED,
          '申请的邀请码数量已达到上限，不能继续申请了'
        )
      }

      let inviteCode
      let inviteCodeRecord
      let inviteCodeId

      while (inviteCode = util.randomStr(6).toLowerCase()) {
        inviteCodeRecord = await this.findOneBy({
          invite_code: inviteCode,
        })
        if (!inviteCodeRecord) {
          inviteCodeId = await this.insert({
            user_id: currentUser.id,
            invite_code: inviteCode,
          })
          break
        }
      }

      return inviteCodeId

    }

    /**
     * 获取用户的邀请码列表
     *
     * @param {number} userId 用户 id
     * @return {Array}
     */
    async getInviteCodeListByUserId(userId) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      if (currentUser.id !== userId) {
        this.throw(
          code.PERMISSION_DENIED,
          '无权限查看别人申请的邀请码'
        )
      }

      return await this.findBy({
        where: {
          user_id: userId,
        }
      })

    }

    /**
     * 验证邀请码是否可用
     *
     * @param {string} inviteCode
     * @return {Object} 如果邀请码可用，返回该邀请码数据
     */
    async checkInviteCodeAvailable(inviteCode) {

      if (config.system.ignoreInviteCode) {
        return
      }

      const { account } = this.service

      const result = await this.findOneBy({
        invite_code: inviteCode,
      })

      const { PARAM_INVALID } = code

      if (!result) {
        this.throw(
          PARAM_INVALID,
          '邀请码不存在'
        )
      }

      const passedTime = Date.now() - result.create_time.getTime()
      const expiredTime =  app.limit.INVITE_CODE_MAX_AGE_BY_MONTH * moment.MONTH
      if (passedTime > expiredTime) {
        this.throw(
          PARAM_INVALID,
          '邀请码已过期'
        )
      }

      const inviteCodeUsed = await account.inviteCodeUsed.getInviteCodeUsedByInviteCodeId(inviteCode.id)
      if (inviteCodeUsed) {
        this.throw(
          PARAM_INVALID,
          '邀请码已被使用'
        )
      }

      return result

    }

  }
  return InviteCode
}
