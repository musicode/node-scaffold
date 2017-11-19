
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/extend/helper.test.js', () => {

  describe('helper', () => {

    it('uuid should be a string', () => {
      const ctx = app.mockContext()
      const uuid = ctx.helper.uuid()
      assert(typeof uuid === 'string')
      assert(uuid.length > 10)
    })

    it('randomInt should be a number', () => {
      const ctx = app.mockContext()
      const length = 10
      const randomInt = ctx.helper.randomInt(length)
      assert(typeof randomInt === 'number')
      assert(('' + randomInt).length === length)
      assert(randomInt !== ctx.helper.randomInt(length))
    })

  })
})