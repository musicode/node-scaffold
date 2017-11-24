
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/util.test.js', () => {

  describe('helper', () => {

    it('uuid should be a string', () => {
      const uuid = app.util.uuid()
      assert(typeof uuid === 'string')
      assert(uuid.length > 10)
    })

    it('randomInt should be a number', () => {
      const length = 10
      const randomInt = app.util.randomInt(length)
      assert(typeof randomInt === 'number')
      assert(('' + randomInt).length === length)
      assert(randomInt !== app.util.randomInt(length))
    })

    it('object parse/stringify', () => {
      const object = {
        name: 'test',
        age: 10,
        married: false,
        birthday: new Date()
      }
      const str = app.util.stringifyObject(object)
      const newObject = app.util.parseObject(str)
      assert(newObject.name === object.name)
      assert(newObject.age === object.age)
      assert(newObject.married === object.married)
      assert(newObject.birthday.getTime() === object.birthday.getTime())
    })

  })
})