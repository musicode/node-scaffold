
const UADevice = require('ua-device')

const UA = Symbol('Context#ua')
const INPUT = Symbol('Context#input')
const OUTPUT = Symbol('Context#output')

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

}
