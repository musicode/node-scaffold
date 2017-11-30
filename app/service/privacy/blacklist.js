/**
 * 拉黑某些人
 */

'use strict'

const uniq = require('lodash/uniq')
const findIndex = require('lodash/findIndex')

module.exports = app => {

  const { code, util, mysql } = app

  class Blacklist extends app.BaseService {

    get tableName() {
      return 'privacy_blacklist'
    }

    get fields() {
      return [
        'user_id', 'target_id',
      ]
    }

    /**
     * 拉黑某人
     *
     * @param {number} targetId
     */
    async addUserToBlacklist(targetId) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      if (targetId == currentUser.id) {
        this.throw(
          code.PARAM_INVALID,
          '不能拉黑自己'
        )
      }

      const record = await this.findOneBy({
        user_id: currentUser.id,
        target_id: targetId,
      })
      if (record) {
        this.throw(
          code.PARAM_INVALID,
          '已拉黑，不能再次拉黑'
        )
      }

      await account.user.checkUserAvailableById(targetId)

      await this.insert({
        user_id: currentUser.id,
        target_id: targetId,
      })

    }

    /**
     * 取消拉黑某人
     *
     * @param {number} targetId
     */
    async removeUserFromBlacklist(targetId) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const record = await this.findOneBy({
        user_id: currentUser.id,
        target_id: targetId,
      })
      if (!record) {
        this.throw(
          code.PARAM_INVALID,
          '未拉黑，不能取消拉黑'
        )
      }

      await this.delete({
        id: record.id,
      })

    }

    /**
     * 设置黑名单
     *
     * @param {Array.<number>} targetIds
     */
    async setBlacklist(targetIds) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      targetIds = uniq(targetIds)

      await util.each(
        targetIds,
        async targetId => {
          if (targetId == currentUser.id) {
            this.throw(
              code.PARAM_INVALID,
              '不能拉黑自己'
            )
          }
          else {
            await account.user.checkUserAvailableById(targetId)
          }
        }
      )

      const isSuccess = await this.transaction(
        async () => {
          await this.delete({
            user_id: currentUser.id,
          })
          if (targetIds.length) {
            const rows = targetIds.map(
              targetId => {
                return {
                  user_id: currentUser.id,
                  target_id: targetId,
                }
              }
            )
            const result = await mysql.insert(this.tableName, rows)
            return result.affectedRows === targetIds.length
          }
          return true
        }
      )

      if (!isSuccess) {
        this.throw(
          code.DB_ERROR,
          '设置失败'
        )
      }
    }

    /**
     * 获取黑名单
     *
     * @param {number} userId
     * @return {Array.<number>}
     */
    async getBlacklistByUserId(userId) {
      const list = await this.findBy({
        where: {
          user_id: userId,
        }
      })
      return list.map(
        item => {
          return item.target_id
        }
      )
    }

    /**
     * user 是否拉黑 target
     *
     * @param {number} userId
     * @param {number} targetId
     * @return {boolean}
     */
    async hasBlacked(userId, targetId) {
      const record = await this.findOneBy({
        user_id: userId,
        target_id: targetId,
      })
      return record ? true : false
    }

  }
  return Blacklist
}