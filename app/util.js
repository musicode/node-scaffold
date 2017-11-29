'use strict'

const uuidv1 = require('uuid/v1')
const random = require('lodash/random')

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

  parseCover(html) {
    const result = html.match(/<img[^>]+src="([^"]+)"/i)
    if (result) {
      return result[1]
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
  }

}