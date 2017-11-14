
const UADevice = require('ua-device')

const UA = Symbol('Context#ua')
const INPUT = Symbol('Context#input')
const OUTPUT = Symbol('Context#output')
const ACCESS_TOKEN = Symbol('Context#accessToken')
const CURRENT_USER = Symbol('Context#currentUser')

module.exports = {

  /**
   * 访客的客户端信息
   */
  get ua() {
    if (!this[UA]) {
      let ua = new UADevice(
        this.get('user-agent')
      )
      this[UA] = {
        browser: {
          name: ua.browser.name.toLowerCase(),
          version: ua.browser.version.original,
        },
        os: {
          name: ua.os.name.toLowerCase(),
          version: ua.os.version.original,
        },
        device: {
          type: ua.device.type,
          model: ua.device.model,
          manufacturer: ua.device.manufacturer,
        },
      }
    }
    return this[UA]
  },

  /**
   * 输入参数
   */
  get input() {
    if (!this[INPUT]) {
      this[INPUT] = this.method === 'POST'
        ? this.request.body
        : this.request.query
    }
    return this[INPUT]
  },

  /**
   * 输出数据
   */
  get output() {
    if (!this[OUTPUT]) {
      this[OUTPUT] = { }
    }
    return this[OUTPUT]
  },

  /**
   * 创建分页信息对象，返回列表型数据时需要用到这个方法
   *
   * @param {numbebr} totalSize 数据总条数
   * @return {Object}
   */
  createPager(totalSize) {
    let { page, page_size } = this.input
    return {
      page: page,
      count: Math.ceil(totalSize / page_size),
      page_size: page_size,
      total_size: totalSize,
    }
  },

  /**
   * 获取身份标识符
   * 不存在时新建一个
   */
  async getAccessToken() {
    if (!this[ACCESS_TOKEN]) {
      let accessToken = this.input.access_token
      if (!accessToken) {
        accessToken = this.cookies.get('access_token')
        if (!accessToken) {
          let { config, redis } = this.app
          accessToken = this.helper.uuid()
          let key = `session:${accessToken}`
          // 写进 redis
          await redis.hset(key, config.session.currentUser, accessToken)
          // 设置过期时间
          await redis.expire(key, config.session.maxAge)
          // 如果对方有 cookie 功能
          this.cookies.set(
            'access_token',
            accessToken,
            {
              maxAge: config.session.maxAge
            }
          )
          // 作为结果返回
          this.output.accessToken = accessToken
        }
      }
      this[ACCESS_TOKEN] = accessToken
    }
    return this[ACCESS_TOKEN]
  },

  /**
   * 当前登录用户
   */
  async getCurrentUser() {
    if (this[CURRENT_USER] == null) {
      let { config, redis } = this.app
      let accessToken = await this.getAccessToken()
      let userId = await redis.hget(`session:${accessToken}`, config.session.currentUser)
      if (userId) {
        this[CURRENT_USER] = await redis.hgetall(`user:${userId}`)
      }
      else {
        this[CURRENT_USER] = false
      }
    }
    return this[CURRENT_USER]
  },

}
