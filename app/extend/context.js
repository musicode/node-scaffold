
const UADevice = require('ua-device')

const UA = Symbol('Context#ua')
const INPUT = Symbol('Context#input')
const OUTPUT = Symbol('Context#output')
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

  set output(output) {
    this[OUTPUT] = output
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
   * 当前登录用户
   */
  async getCurrentUser() {
    if (this[CURRENT_USER] == null) {
      let userId = this.service.account.session.get(
        this.app.config.session.currentUser
      )
      if (userId) {
        this[CURRENT_USER] = await this.service.account.user.getCache(userId)
      }
      else {
        this[CURRENT_USER] = false
      }
    }
    return this[CURRENT_USER]
  },

}
