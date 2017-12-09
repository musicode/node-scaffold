
'use strict'

module.exports = app => {

  const { util } = app

  class Friend extends app.BaseService {

    get tableName() {
      return 'relation_followee'
    }

    /**
     * 获取某个用户的好友数量
     *
     * @param {number} userId
     * @param {Object} options
     * @return {number}
     */
    async getFriendCount(userId) {

      const sql = this._formatQuerySQL(userId, 'COUNT(*) AS count')

      const row = await this.queryOne(sql)

      return row.count

    }

    /**
     * 获取某个用户的好友列表
     *
     * @param {number} userId
     * @return {Array}
     */
    async getFriendList(userId) {

      let sql = this._formatQuerySQL(userId, 'a.id, a.followee_id as friend_id, a.update_time as create_time')

      sql += ' ORDER BY create_time desc'

      return await this.query(sql)

    }

    /**
     * 格式化查询 SQL
     *
     * @param {number} userId
     * @param {string} columns
     * @return {string}
     */
    _formatQuerySQL(userId, columns) {

      return `SELECT ${columns} FROM ${this.tableName} AS a INNER JOIN ${this.tableName} AS b `
        + `ON a.user_id = b.followee_id AND a.followee_id = b.user_id AND a.user_id = ${userId}`

    }

    /**
     * 好友动态
     */
    async getFrienIdListForNews() {

      const { account, relation, privacy } = this.service

      const currentUser = await account.session.checkCurrentUser()

      const friendList = await this.getFriendList(currentUser.id)
      const blockedIds = await privacy.activityBlocked.getBlockedUserListByUserId(currentUser.id)

      const ids = [ ]

      await util.each(
        friendList,
        async item => {
          if (blockedIds.indexOf(item.friend_id) < 0) {
            const deniedIds = await privacy.activityDenied.getDeniedUserListByUserId(item.friend_id)
            if (deniedIds.indexOf(currentUser.id) < 0) {
              ids.push(item.friend_id)
            }
          }
        }
      )

      return ids

    }


  }
  return Friend
}
