
const UADevice = require('ua-device')

const UA = Symbol('Context#ua')

module.exports = {
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
}
