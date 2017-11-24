
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/extend/helper.test.js', () => {

  describe('helper', () => {

    it('uuid should be a string', () => {
      const ctx = app.mockContext()
      const uuid = app.util.uuid()
      assert(typeof uuid === 'string')
      assert(uuid.length > 10)
    })

    it('randomInt should be a number', () => {
      const ctx = app.mockContext()
      const length = 10
      const randomInt = app.util.randomInt(length)
      assert(typeof randomInt === 'number')
      assert(('' + randomInt).length === length)
      assert(randomInt !== app.util.randomInt(length))
    })

    it('object parse/stringify', () => {
      const ctx = app.mockContext()
      const object = {
        name: 'test',
        age: 10,
        married: false
      }
      const str = app.util.stringifyObject(object)
      const newObject = app.util.parseObject(str)

      assert(JSON.stringify(object) === JSON.stringify(newObject))
    })

  })
})