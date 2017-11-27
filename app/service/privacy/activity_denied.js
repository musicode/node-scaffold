/**
 * 不让 TA 看我的动态
 */

'use strict'

const uniq = require('lodash/uniq')
const findIndex = require('lodash/findIndex')

module.exports = app => {

  const { code, util, mysql } = app

  class ActivityDenied extends app.BaseService {

    get tableName() {
      return 'privacy_activity_denied'
    }

    get fields() {
      return [
        'user_id', 'target_id',
      ]
    }

    /**
     * 设置不让谁看我的动态
     *
     * @param {Array.<number>} targetIds
     */
    async setDeniedUserList(targetIds) {

      const { account } = this.service

      const currentUser = await account.session.checkCurrentUser()

      targetIds = uniq(targetIds)

      await util.each(
        targetIds,
        async targetId => {
          if (targetId == currentUser.id) {
            this.throw(
              code.PARAM_INVALID,
              '不能屏蔽自己'
            )
          }
          else {
            await account.user.checkUserExisted(targetId)
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
     * 获取用户不让谁看他的动态
     *
     * @param {number} userId
     * @return {Array.<number>}
     */
    async getDeniedUserListByUserId(userId) {
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

  }
  return ActivityDenied
}