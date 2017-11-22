'use strict'

const bcrypt = require('bcryptjs')
const salt = 10

const code = require('../../constant/code')

module.exports = app => {
  class User extends app.BaseService {

    get tableName() {
      return 'account_user'
    }

    get fields() {
      return [
        'number', 'mobile', 'password', 'email', 'status'
      ]
    }

    async createHash(password) {
      return bcrypt.hash(password, salt)
    }

    async checkPassword(password, hash) {
      return bcrypt.compare(password, hash)
    }

    async getUserById(userId) {
      const user = await this.ctx.service.account.user.findOneBy({
        id: userId
      })
      const userInfo = await this.ctx.service.account.userInfo.getUserInfoByUserId(userId)
      for (let key in userInfo) {
        if (!user[key]) {
          user[key] = userInfo[key]
        }
      }
      if (user.password) {
        user.password = true
      }
      return user
    }

    async signup(data) {

      const { session } = this.service.account
      const { currentUser } = this.config.session

      let userId = await session.get(currentUser)
      if (userId) {
        this.throw(
          code.RESOURCE_EXISTS,
          '已登录，无法注册'
        )
      }

      let user = await this.findOneBy({
        mobile: data.mobile,
      })

      if (user) {
        this.throw(
          code.RESOURCE_EXISTS,
          '该手机号已注册'
        )
      }

      userId = this.transaction(
        async () => {

          let number = this.ctx.helper.randomInt(6)
          let password = await this.createHash(data.password)

          let userId = await super.insert({
            number,
            password,
            mobile: data.mobile,
          })

          data.user_id = userId
          await this.service.account.userInfo.insert(data)

          let { request } = this.ctx
          await this.service.account.register.insert({
            user_id: userId,
            client_ip: request.ip,
            user_agent: request.get('user-agent'),
          })

          return userId

        }
      )

      if (userId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '注册失败'
        )
      }

      await session.set(currentUser, userId)

      return userId

    }

    /**
     * 登录
     *
     * @param {Object} data
     * @property {string} data.mobile
     * @property {string} data.password
     * @return {Object} 登录用户对象
     */
    async signin(data) {

      const { session } = this.service.account
      const { currentUser } = this.config.session

      let userId = await session.get(currentUser)
      if (userId) {
        this.throw(
          code.RESOURCE_EXISTS,
          '已登录，无法重复登录'
        )
      }

      let user = await this.findOneBy({
        mobile: data.mobile,
      })

      if (!user) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '该手机号未注册'
        )
      }

      let matched = await this.checkPassword(data.password, user.password)
      if (!matched) {
        this.throw(
          code.AUTH_ERROR,
          '手机号或密码错误'
        )
      }

      await session.set(currentUser, user.id)

      return user

    }

    /**
     * 退出登录
     */
    async signout() {

      const { session } = this.service.account
      const { currentUser } = this.config.session

      const userId = await session.get(currentUser)
      if (!userId) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '未登录，无法退出登录'
        )
      }

      session.remove(currentUser)

    }

  }
  return User
}
