'use strict'

const bcrypt = require('bcryptjs')

module.exports = app => {

  const { code, util, limit, redis, config } = app

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
      return bcrypt.hash(password.toLowerCase(), 10)
    }

    async checkPassword(password, hash) {
      return bcrypt.compare(password.toLowerCase(), hash)
    }

    /**
     * 获取用户的完整信息
     *
     * @param {string|Object} userId
     */
    async getUserById(userId) {

      let user
      if (userId && userId.id) {
        user = userId
        userId = user.id
      }

      const { service } = this.ctx

      const key = `user:${userId}`
      const value = await redis.get(key)

      if (value) {
        return util.parseObject(value)
      }

      if (!user) {
        user = await this.findOneBy({
          id: userId
        })
        if (!user) {
          this.throw(
            code.RESOURCE_NOT_FOUND,
            '该用户不存在'
          )
        }
      }

      const userInfo = await service.account.userInfo.getUserInfoByUserId(userId)
      for (let key in userInfo) {
        if (!user[key]) {
          user[key] = userInfo[key]
        }
      }

      redis.set(key, util.stringifyObject(user))

      return user
    }

    async updateRedis(user, fields) {

      const key = `user:${user.id}`
      const value = await redis.get(key)

      if (!value) {
        return
      }

      const userObject = util.parseObject(value)
      Object.assign(userObject, fields)

      await redis.set(key, util.stringifyObject(userObject))

    }

    toExternal(user) {
      const result = { }
      Object.assign(result, user)

      result.password = result.password ? true : false
      const { number } = result
      delete result.id

      if (result.user_id) {
        delete result.user_id
      }
      if (result.user_number) {
        delete result.user_number
      }

      result.id = number

      return result
    }

    /**
     * 注册
     *
     * @param {Object} data
     * @property {string} data.mobile
     * @property {string} data.password
     * @property {string?} data.verify_code 如果传了验证码，必须和 session 保存的一致
     * @property {string?} data.invite_code 如果传了邀请码，必须是可用状态的邀请码
     * @property {...} 其他 user info 字段
     * @return {number} 新插入的 user id
     */
    async signup(data) {

      const { account } = this.service
      const { currentUser, verifyCode } = config.session

      let userId = await account.session.get(currentUser)
      if (userId) {
        this.throw(
          code.RESOURCE_EXISTS,
          '已登录，无法注册'
        )
      }

      if (data.mobile) {
        await this.service.account.session.checkVerifyCode(data.verify_code)
      }

      const user = await this.findOneBy({
        mobile: data.mobile,
      })

      if (user) {
        this.throw(
          code.PARAM_INVALID,
          '手机号已注册'
        )
      }


      let inviteCode
      if (data.invite_code) {
        inviteCode = await account.inviteCode.checkAvailable(data.invite_code)
      }

      userId = await this.transaction(
        async () => {

          const number = util.randomInt(limit.USER_NUMBER_LENGTH)
          const password = await this.createHash(data.password)

          const userId = await super.insert({
            number,
            password,
            mobile: data.mobile,
          })

          data.user_id = userId
          await account.userInfo.insert(data)

          const { request } = this.ctx
          await account.register.insert({
            user_id: userId,
            client_ip: request.ip,
            user_agent: request.get('user-agent'),
          })

          if (inviteCode) {
            await account.inviteCodeUsed.insert({
              user_id: userId,
              invite_code_id: inviteCode.id,
            })
          }

          return userId

        }
      )

      if (userId == null) {
        this.throw(
          code.DB_INSERT_ERROR,
          '注册失败'
        )
      }

      await account.session.set(currentUser, userId)

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

      const { account } = this.service
      const { currentUser } = config.session

      const userId = await account.session.get(currentUser)
      if (userId) {
        this.throw(
          code.RESOURCE_EXISTS,
          '已登录，无法重复登录'
        )
      }

      const user = await this.findOneBy({
        mobile: data.mobile,
      })

      if (!user) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '该手机号未注册'
        )
      }

      const matched = await this.checkPassword(data.password, user.password)
      if (!matched) {
        this.throw(
          code.AUTH_ERROR,
          '手机号或密码错误'
        )
      }

      const { request } = this.ctx
      await account.login.insert({
        user_id: user.id,
        client_ip: request.ip,
        user_agent: request.get('user-agent'),
      })

      await account.session.set(currentUser, user.id)

      return user

    }

    /**
     * 退出登录
     */
    async signout() {

      const { session } = this.service.account
      const { currentUser } = config.session

      const userId = await session.get(currentUser)
      if (!userId) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '未登录，无法退出登录'
        )
      }

      session.remove(currentUser)

    }


    async checkMobileAvailable(mobile) {
      const existed = await this.findOneBy({ mobile })
      if (existed) {
        this.throw(
          code.PARAM_INVALID,
          '手机号已被占用'
        )
      }
    }

    async checkEmailAvailable(email) {
      const existed = await this.findOneBy({ email })
      if (existed) {
        this.throw(
          code.PARAM_INVALID,
          '邮箱已被占用'
        )
      }
    }

    /**
     * 设置手机号
     *
     * @param {Object} data
     * @property {string} data.mobile
     * @property {string} data.verify_code
     */
    async setMobile(data) {

      const { account } = this.service

      // 先判断是本人操作
      const currentUser = await account.session.checkCurrentUser()
      // 判断验证码的有效性
      await account.session.checkVerifyCode(data.verify_code)

      if (currentUser.mobile !== data.mobile) {
        await this.checkMobileAvailable(data.mobile)
        const fields = {
          mobile: data.mobile,
        }
        const rows = await this.update(fields, { id: currentUser.id })
        if (rows === 1) {
          await this.updateRedis(currentUser, fields)
          return true
        }
        return false
      }

      return true

    }

    /**
     * 设置邮箱
     *
     * @param {Object} data
     * @property {string} data.email
     */
    async setEmail(data) {

      const { account } = this.service

      // 先判断是本人操作
      const currentUser = await account.session.checkCurrentUser()

      if (currentUser.email !== data.email) {
        await this.checkEmailAvailable(data.email)
        const fields = {
          email: data.email,
        }
        const rows = await this.update(fields, { id: currentUser.id })
        if (rows === 1) {
          await this.updateRedis(currentUser, fields)
          return true
        }
        return false
      }

      return true

    }

    /**
     * 设置登录密码
     *
     * @param {Object} data
     * @property {string} data.password
     * @property {string} data.old_password
     */
    async setPassword(data) {

      const { account } = this.service

      // 先判断是本人操作
      const currentUser = await account.session.checkCurrentUser()

      if (!data.old_password) {
        this.throw(
          code.PARAM_INVALID,
          '缺少旧密码'
        )
      }

      const matched = await this.checkPassword(data.old_password, currentUser.password)
      if (!matched) {
        this.throw(
          code.PARAM_INVALID,
          '旧密码错误'
        )
      }

      const password = await this.createHash(data.password)

      const fields = {
        password,
      }
      const rows = await this.update(fields, { id: currentUser.id })

      if (rows === 1) {
        await this.updateRedis(currentUser, fields)
        return true
      }
      return false

    }

    /**
     * 浏览用户详细资料
     *
     * @param {number} userId
     */
    viewUser(userId) {

      const { account } = this.service

      const currentUser = await account.session.getCurrentUser()

      await this.checkUserViewAuth(userId, currentUser)

      const targetUser = await this.getUserById(userId)
      const statInfo = await this.getUserStatInfoById(userId)

      Object.assign(targetUser, statInfo)

      return targetUser

    }


    /**
     * 递增用户的浏览量
     *
     * @param {number} userId
     */
    async increaseUserViewCount(userId) {

      const { account } = this.service

      const currentUser = await account.session.getCurrentUser()

      await this.checkUserViewAuth(userId, currentUser)

      await redis.hincrby(`user_stat:${userId}`, 'view_cont', 1)

    }

    /**
     * 用户的详细资料是否可以被当前登录用户浏览
     *
     * @param {number} userId
     * @param {Object} currentUser
     */
    async checkUserViewAuth(userId, currentUser) {
      if (!config.userViewByGuest && !currentUser) {
        this.throw(
          code.AUTH_UNSIGNIN,
          '只有登录用户才可以浏览用户详细资料'
        )
      }

    }

    /**
     * 获取用户的统计数据
     *
     * @param {number} userId
     */
    async getUserStatInfoById(userId) {
      return await redis.hgetall(`user_stat:${userId}`)
    }

  }
  return User
}
