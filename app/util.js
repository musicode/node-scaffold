'use strict'

const striptags = require('striptags')
const uuidv1 = require('uuid/v1')
const random = require('lodash/random')
const truncate = require('lodash/truncate')

const TYPE_STRING = '1'
const TYPE_NUMBER = '2'
const TYPE_BOOLEAN = '3'
const TYPE_DATE = '4'

module.exports = {

  uuid() {
    return uuidv1()
  },

  type(value) {
    return Object.prototype.toString.call(value).toLowerCase().slice(8, -1)
  },

  async each(array, handler) {
    const { length } = array
    for (let i = 0, result; i < length; i++) {
      result = await handler(array[i], i)
      if (result === false) {
        break
      }
    }
  },

  randomInt(length) {
    let min = Math.pow(10, length - 1)
    let max = Math.pow(10, length) - 1
    return min + Math.floor(Math.random() * (max - min))
  },

  randomStr(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const minIndex = 0
    const maxIndex = chars.length - 1
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars[random(minIndex, maxIndex)]
    }
    return result
  },

  toNumber(value, defaultValue = 0) {
    value = + value
    return isNaN(value) ? defaultValue : value
  },

  renderSummary(str, maxLength) {

    str = str.replace(/<img [^>]+>/gi, '[图片]')
    str = striptags(str)
    str = str
      .replace(/(?:&nbsp;|&#160;|\n)/g, ' ')
      .replace(/(?:&lt;|&#60;)/g, '<')
      .replace(/(?:&gt;|&#62;)/g, '>')
      .replace(/(?:&amp;|&#38;)/g, '&')
      .replace(/(?:&quot;|&#34;)/g, '"')
      .replace(/(?:&apos;|&#39;)/g, "'")
      .replace(/(?:&cent;|&#162;)/g, '￠')
      .replace(/(?:&pound;|&#163;)/g, '£')
      .replace(/(?:&yen;|&#165;)/g, '¥')
      .replace(/(?:&sect;|&#167;)/g, '§')
      .replace(/(?:&copy;|&#169;)/g, '©')
      .replace(/(?:&reg;|&#174;)/g, '®')
      .replace(/(?:&times;|&#215;)/g, '×')
      .replace(/(?:&divide;|&#247;)/g, '÷')
      .trim()

    return maxLength > 0
      ? truncate(
          str,
          {
            length: maxLength,
            omission: '...'
          }
        )
      : str

  },

  formatMobile(mobile) {
    return mobile.replace(/(\d{3})(\d{5})(\d{3})/, '$1*****$3')
  },

  parseCover(html) {
    if (html) {
      const result = html.match(/<img[^>]+src="([^"]+)"/i)
      if (result) {
        return result[ 1 ]
      }
    }
  },

  parseObject(str) {
    const result = { }
    str.split(';').forEach(
      pair => {

        const [ key, content ] = pair.split(':')

        const index = content.indexOf('_')
        const type = content.substr(0, index)
        const value = content.substr(index + 1)

        switch (type) {
          case TYPE_STRING:
            result[ key ] = decodeURIComponent(value)
            break
          case TYPE_NUMBER:
            result[ key ] = + value
            break
          case TYPE_BOOLEAN:
            result[ key ] = value == 1
            break
          case TYPE_DATE:
            result[ key ] = new Date(+ value)
            break
        }

      }
    )
    return result
  },

  stringifyObject(data) {
    const result = [ ]
    for (let key in data) {
      let value = data[key]
      let type = this.type(value)

      switch (type) {
        case 'string':
          type = TYPE_STRING
          value = encodeURIComponent(value)
          break

        case 'number':
          type = TYPE_NUMBER
          value = value
          break

        case 'boolean':
          type = TYPE_BOOLEAN
          value = value ? 1 : 0
          break

        case 'date':
          type = TYPE_DATE
          value = value.getTime()
          break

        default:
          throw new Error(`util.stringifyObject: data.${key} is a ${type}.`)
      }
      result.push(
        `${key}:${type}_${value}`
      )
    }
    return result.join(';')
  },

  throw(code, message) {
    const error = new Error()
    error.code = code
    error.message = message
    throw error
  }

}