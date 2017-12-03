
'use strict'

module.exports = app => {

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

      return `
        SELECT ${columns} FROM ${this.tableName} AS a INNER JOIN ${this.tableName} AS b ON a.user_id = b.followee_id AND a.followee_id = b.user_id AND a.user_id = ${userId}
      `

    }


  }
  return Friend
}
