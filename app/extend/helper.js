
const uuidv1 = require('uuid/v1')

module.exports = {

  uuid() {
    return uuidv1()
  },

  randomInt(length) {
    let min = Math.pow(10, length - 1)
    let max = Math.pow(10, length) - 1
    return min + Math.floor(Math.random() * (max - min))
  },

}