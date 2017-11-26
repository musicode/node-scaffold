
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/career.test.js', () => {

  describe('career service', () => {

    let user

    it('register a new user', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      user = {
        mobile: '1' + app.util.randomInt(10),
        password: '123456',
      }

      await userService.signup({
        mobile: user.mobile,
        password: user.password,
        verify_code: '123133',
      })

    })

    it('crud career', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      let item = {
        company: 'company1',
        job: 'job1',
        description: 'description1',
        start_date: '2010-10-10',
        end_date: '2010-10-10',
      }

      let count = 0

      try {
        await account.career.createCareer(item)
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
      }

      currentUser = await account.user.signin(user)

      let careerId = await account.career.createCareer(item)
      count++

      assert(app.util.type(careerId) === 'number')

      let career = await account.career.getCareerById(careerId)
      assert(career.id === careerId)

      let company = '1233331__'
      let result = await account.career.updateCareerById({ company }, careerId)

      assert(result === true)

      career = await account.career.getCareerById(careerId)
      assert(career.company === company)

      let list = await account.career.getCareerListByUserId(currentUser.id)
      assert(list.length === count)


      await account.career.createCareer(item)
      count++

      list = await account.career.getCareerListByUserId(currentUser.id)
      assert(list.length === count)

      result = await account.career.deleteCareerById(careerId)
      count--

      assert(result === true)

      try {
        await account.career.deleteCareerById(careerId)
        count--
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
      }

      list = await account.career.getCareerListByUserId(currentUser.id)
      assert(list.length === count)



    })

  })
})