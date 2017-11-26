
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/education.test.js', () => {

  describe('education service', () => {

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

    it('crud education', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      let item = {
        college: 'college1',
        speciality: 'speciality1',
        college: '本科',
        description: 'description1',
        start_date: '2010-10-10',
        end_date: '2010-10-10',
      }

      let count = 0

      try {
        await account.education.createEducation(item)
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
      }

      currentUser = await account.user.signin(user)

      let educationId = await account.education.createEducation(item)
      count++

      assert(app.util.type(educationId) === 'number')

      let education = await account.education.getEducationById(educationId)
      assert(education.id === educationId)

      let college = '1233331__'
      let result = await account.education.updateEducationById({ college }, educationId)

      assert(result === true)

      education = await account.education.getEducationById(educationId)
      assert(education.college === college)

      let list = await account.education.getEducationListByUserId(currentUser.id)
      assert(list.length === count)


      await account.education.createEducation(item)
      count++

      list = await account.education.getEducationListByUserId(currentUser.id)
      assert(list.length === count)

      result = await account.education.deleteEducationById(educationId)
      count--

      assert(result === true)

      try {
        await account.education.deleteEducationById(educationId)
        count--
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
      }

      list = await account.education.getEducationListByUserId(currentUser.id)
      assert(list.length === count)



    })

  })
})