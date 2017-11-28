'use strict'

const bcrypt = require('bcryptjs')

module.exports = app => {

  const { code, util, limit, redis, config, eventEmitter } = app

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
     * 检查用户是否存在
     *
     * @param {number} userId
     * @return {Object}
     */
    async checkUserExistedById(userId) {
      const user = await this.findOneBy({
        id: userId,
      })
      if (!user) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '该用户不存在'
        )
      }
      return user
    }

    /**
     * 检查用户是否存在
     *
     * @param {number} userNumber
     * @return {Object}
     */
    async checkUserExistedByNumber(userNumber) {
      const user = await this.findOneBy({
        number: userNumber,
      })
      if (!user) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '该用户不存在'
        )
      }
      return user
    }

    /**
     * 获取用户的完整信息
     *
     * @param {number|Object} userId
     * @return {Object}
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
        user = await this.checkUserExistedById(userId)
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

    /**
     * 通过 number 获取用户的完整信息
     *
     * 因为用户是通过 number 来发送请求的，所以这个接口比较常用
     *
     * @param {number} userNumber
     * @return {Object}
     */
    async getUserByNumber(userNumber) {

      if (!userNumber) {
        this.throw(
          code.PARAM_INVALID,
          '缺少 user number'
        )
      }

      const user = await this.findOneBy({
        number: userNumber,
      })

      if (!user) {
        this.throw(
          code.RESOURCE_NOT_FOUND,
          '用户不存在'
        )
      }

      return await this.getUserById(user)

    }

    toExternal(user) {
      const result = { }
      Object.assign(result, user)

      result.password = result.password ? true : false
      const { number } = result
      delete result.id
      delete result.number

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
        inviteCode = await account.inviteCode.checkInviteCodeAvailable(data.invite_code)
      }

      userId = await this.transaction(
        async () => {

          const number = util.randomInt(limit.USER_NUMBER_LENGTH)
          const password = await this.createHash(data.password)

          const userId = await this.insert({
            number,
            password,
            mobile: data.mobile,
          })

          data.user_id = userId

          const fields = account.userInfo.getFields(data)

          if (fields) {
            await account.userInfo.insert(fields)
          }

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

      eventEmitter.emit(
        eventEmitter.USER_ADD,
        {
          userId,
        }
      )

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

    /**
     * 检测手机号是否未注册
     *
     * @param {string} mobile
     */
    async checkMobileAvailable(mobile) {
      const existed = await this.findOneBy({ mobile })
      if (existed) {
        this.throw(
          code.PARAM_INVALID,
          '手机号已被占用'
        )
      }
    }

    /**
     * 检测邮箱是否未绑定
     *
     * @param {string} email
     */
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
     * @return {boolean}
     */
    async setMobile(data) {

      const { account } = this.service

      // 判断是本人操作
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
          await this.updateRedis(`user:${currentUser.id}`, fields)
          eventEmitter.emit(
            eventEmitter.USER_UDPATE,
            {
              userId: currentUser.id,
              fields,
            }
          )
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
     * @return {boolean}
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
          await this.updateRedis(`user:${currentUser.id}`, fields)
          eventEmitter.emit(
            eventEmitter.USER_UDPATE,
            {
              userId: currentUser.id,
              fields,
            }
          )
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
     * @return {boolean}
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
        await this.updateRedis(`user:${currentUser.id}`, fields)
        eventEmitter.emit(
          eventEmitter.USER_UDPATE,
          {
            userId: currentUser.id,
            fields,
          }
        )
        return true
      }
      return false

    }

    /**
     * 找回密码
     *
     * @param {Object} data
     * @property {string} data.mobile
     * @property {string} data.password
     * @property {string} data.verify_code
     * @return {boolean}
     */
    async resetPassword(data) {

      const { account } = this.service

      await account.session.checkVerifyCode(data.verify_code)

      const user = await this.findOneBy({
        mobile: data.mobile,
      })

      if (!user) {
        this.throw(
          code.PARAM_INVALID,
          '该用户不存在'
        )
      }

      const password = await this.createHash(data.password)

      const fields = {
        password,
      }
      const rows = await this.update(fields, { id: user.id })

      if (rows === 1) {
        await this.updateRedis(`user:${user.id}`, fields)
        eventEmitter.emit(
          eventEmitter.USER_UDPATE,
          {
            userId: user.id,
            fields,
          }
        )
        return true
      }
      return false

    }

    /**
     * 浏览用户详细资料
     *
     * @param {number} userId
     */
    async viewUser(userId) {

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

      const key = `user_stat:${userId}`
      await redis.hincrby(key, 'view_count', 1)

      const viewCount = await redis.hget(key, 'view_count')

      eventEmitter.emit(
        eventEmitter.USER_UDPATE,
        {
          userId,
          fields: {
            view_count: viewCount,
          }
        }
      )

    }

    /**
     * 用户的详细资料是否可以被当前登录用户浏览
     *
     * @param {number} userId
     * @param {Object} currentUser
     */
    async checkUserViewAuth(userId, currentUser) {

      const { privacy, relation } = this.service

      const checkBlacklist = async () => {
        const hasBlacked = await privacy.blacklist.hasBlacked(userId, currentUser.id)
        if (hasBlacked) {
          this.throw(
            code.VISITOR_BLACKED,
            '无权查看该用户的信息'
          )
        }
      }

      if (currentUser) {
        if (userId !== currentUser.id) {
          await privacy.profileAllowed.checkAllowedType(currentUser.id, userId)
          await checkBlacklist()
        }
      }
      else {
        if (!config.userViewByGuest) {
          this.throw(
            code.AUTH_UNSIGNIN,
            '只有登录用户才可以浏览用户详细资料'
          )
        }
        try {
          await privacy.profileAllowed.checkAllowedType(currentUser ? currentUser.id : null, userId)
        }
        catch (err) {
          if (err.code === code.PARAM_INVALID) {
            this.throw(
              code.AUTH_UNSIGNIN,
              '登录后才能访问该用户的详细资料'
            )
          }
          else {
            throw err
          }
        }
      }
    }

    /**
     * 获取用户的统计数据
     *
     * @param {number} userId
     */
    async getUserStatInfoById(userId) {
      const userStatInfo = await redis.hgetall(`user_stat:${userId}`)
      return {
        view_count: util.toNumber(userStatInfo.view_count, 0),
        like_count: util.toNumber(userStatInfo.like_count, 0),
        write_count: util.toNumber(userStatInfo.write_count, 0),
        follower_count: util.toNumber(userStatInfo.follower_count, 0),
      }
    }

  }
  return User
}
