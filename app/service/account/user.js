'use strict'

const bcrypt = require('bcryptjs')

const checkUserNumberCache = { }

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

    get anonymous() {
      return {
        id: '',
        avatar: '',
        nickname: '匿名用户',
        company: '',
        job: '',
        mobile: '',
        email: '',
      }
    }

    async createHash(password) {
      return bcrypt.hash(password.toLowerCase(), 10)
    }

    async checkPassword(password, hash) {
      return bcrypt.compare(password.toLowerCase(), hash)
    }

    async toExternal(user) {
      const result = { }
      Object.assign(result, user)

      result.password = result.password ? true : false
      const { id, number, area_id } = result
      delete result.number

      if (result.user_id) {
        delete result.user_id
      }
      if (result.user_number) {
        delete result.user_number
      }

      if (result.mobile) {
        result.mobile = util.formatMobile(result.mobile)
      }

      if (area_id != null) {
        delete result.area_id
        if (area_id && area_id != 0) {
          result.area = await this.service.common.area.getAreaById(area_id)
        }
      }

      const { account, relation } = this.service
      const currentUser = await account.session.getCurrentUser()
      if (currentUser && currentUser.id !== id) {
        result.is_followee = relation.followee.hasFollow(currentUser.id, id)
        result.is_follower = relation.followee.hasFollow(id, currentUser.id)
      }

      result.id = number
      result.create_time = result.create_time.getTime()
      result.update_time = result.update_time.getTime()

      return result
    }

    /**
     * 检查用户是否存在
     *
     * @param {number|Object} userId
     * @return {Object}
     */
    async checkUserAvailableById(userId) {

      let user
      if (userId && userId.id) {
        user = userId
        userId = user.id
      }

      if (!user && userId) {
        user = await this.getUserById(userId)
      }

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
    async checkUserAvailableByNumber(userNumber) {
      if (checkUserNumberCache[ userNumber ]) {
        return checkUserNumberCache[ userNumber ]
      }
      let user = await this.findOneBy({
        number: userNumber,
      })
      user = await this.checkUserAvailableById(user)
      return checkUserNumberCache[ userNumber ] = user
    }

    /**
     * 获取用户
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

      const { account } = this.service

      const key = `user:${userId}`
      const value = await redis.get(key)

      if (value) {
        return util.parseObject(value)
      }

      if (!user) {
        user = await this.findOneBy({
          id: userId,
        })
      }

      await redis.set(key, util.stringifyObject(user))

      return user
    }

    /**
     * 获取用户的完整信息
     *
     * @param {number|Object} userId
     * @return {Object}
     */
    async getFullUserById(userId) {

      const { account } = this.service

      const user = await this.getUserById(userId)

      const userInfo = await account.userInfo.getUserInfoByUserId(user.id)
      for (let key in userInfo) {
        if (!user[key]) {
          user[key] = userInfo[key]
        }
      }

      user.view_count = await this.getUserViewCount(user.id)
      user.like_count = await this.getUserLikeCount(user.id)
      user.write_count = await this.getUserWriteCount(user.id)
      user.followee_count = await this.getUserFolloweeCount(user.id)
      user.follower_count = await this.getUserFollowerCount(user.id)

      return user

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

          const number = await this.createNumber(limit.USER_NUMBER_LENGTH)
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
        eventEmitter.USER_CREATE,
        {
          userId,
          service: this.service,
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
            eventEmitter.USER_UPDATE,
            {
              userId: currentUser.id,
              service: this.service,
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
            eventEmitter.USER_UPDATE,
            {
              userId: currentUser.id,
              service: this.service,
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
          eventEmitter.USER_UPDATE,
          {
            userId: currentUser.id,
            service: this.service,
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
          eventEmitter.USER_UPDATE,
          {
            userId: user.id,
            service: this.service,
          }
        )
        return true
      }
      return false

    }

    /**
     * 浏览用户详细资料
     *
     * @param {number|Object} userId
     * @return {Object}
     */
    async viewUser(userId) {

      const { account, privacy, relation } = this.service

      const user = await this.getUserById(userId)

      const currentUser = await account.session.getCurrentUser()

      await this.checkViewAvailable(currentUser.id, user.id)

      return await this.getFullUserById(user.id)

    }

    /**
     * 判断 visitor 是否有权限访问 user
     *
     * @param {number} visitorId 访问者 id
     * @param {number} userId
     */
    async checkViewAvailable(visitorId, userId) {

      const { privacy } = this.service

      if (visitorId) {
        if (userId !== visitorId) {
          await privacy.profileAllowed.checkAllowedType(visitorId, userId)

          const hasBlacked = await privacy.blacklist.hasBlacked(userId, visitorId)
          if (hasBlacked) {
            this.throw(
              code.VISITOR_BLACKED,
              '无权查看该用户的信息'
            )
          }

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
          await privacy.profileAllowed.checkAllowedType(visitorId || null, userId)
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
     * 递增用户的浏览量
     *
     * @param {number} userId
     */
    async increaseUserViewCount(userId) {
      await redis.hincrby(`user_stat:${userId}`, 'view_count', 1)
    }

    /**
     * 递减用户的浏览量
     *
     * @param {number} userId
     */
    async decreaseUserViewCount(userId) {
      await redis.hincrby(`user_stat:${userId}`, 'view_count', -1)
    }

    /**
     * 获取用户的浏览量
     *
     * @param {number} userId
     * @return {number}
     */
    async getUserViewCount(userId) {
      const viewCount = await redis.hget(`user_stat:${userId}`, 'view_count')
      return util.toNumber(viewCount, 0)
    }



    /**
     * 递增用户的被点赞量
     *
     * @param {number} userId
     */
    async increaseUserLikeCount(userId) {
      await redis.hincrby(`user_stat:${userId}`, 'like_count', 1)
    }

    /**
     * 递减用户的被点赞量
     *
     * @param {number} userId
     */
    async decreaseUserLikeCount(userId) {
      await redis.hincrby(`user_stat:${userId}`, 'like_count', -1)
    }

    /**
     * 获取用户的被点赞量
     *
     * @param {number} userId
     * @return {number}
     */
    async getUserLikeCount(userId) {
      const likeCount = await redis.hget(`user_stat:${userId}`, 'like_count')
      return util.toNumber(likeCount, 0)
    }





    /**
     * 递增用户的创作量
     *
     * @param {number} userId
     */
    async increaseUserWriteCount(userId) {
      // [TODO] 恢复比较麻烦
      await redis.hincrby(`user_stat:${userId}`, 'write_count', 1)
    }

    /**
     * 递减用户的创作量
     *
     * @param {number} userId
     */
    async decreaseUserWriteCount(userId) {
      await redis.hincrby(`user_stat:${userId}`, 'write_count', -1)
    }

    /**
     * 获取用户的创作量
     *
     * @param {number} userId
     * @return {number}
     */
    async getUserWriteCount(userId) {
      const writeCount = await redis.hget(`user_stat:${userId}`, 'write_count')
      return util.toNumber(writeCount, 0)
    }



    /**
     * 递增用户的关注量
     *
     * @param {number} userId
     */
    async increaseUserFolloweeCount(userId) {
      await redis.hincrby(`user_stat:${userId}`, 'followee_count', 1)
    }

    /**
     * 递减用户的关注量
     *
     * @param {number} userId
     */
    async decreaseUserFolloweeCount(userId) {
      await redis.hincrby(`user_stat:${userId}`, 'followee_count', -1)
    }

    /**
     * 获取用户的关注量
     *
     * @param {number} userId
     * @return {number}
     */
    async getUserFolloweeCount(userId) {
      const followeeCount = await redis.hget(`user_stat:${userId}`, 'followee_count')
      return util.toNumber(followeeCount, 0)
    }



    /**
     * 递增用户的粉丝量
     *
     * @param {number} userId
     */
    async increaseUserFollowerCount(userId) {
      await redis.hincrby(`user_stat:${userId}`, 'follower_count', 1)
    }

    /**
     * 递减用户的粉丝量
     *
     * @param {number} userId
     */
    async decreaseUserFollowerCount(userId) {
      await redis.hincrby(`user_stat:${userId}`, 'follower_count', -1)
    }

    /**
     * 获取用户的粉丝量
     *
     * @param {number} userId
     * @return {number}
     */
    async getUserFollowerCount(userId) {
      const followerCount = await redis.hget(`user_stat:${userId}`, 'follower_count')
      return util.toNumber(followerCount, 0)
    }

  }
  return User
}
