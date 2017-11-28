
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/activity_blocked.test.js', () => {

  describe('activity blocked service', () => {

    let user1
    let user2
    let user3

    it('register a new user', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service
      const userService = account.user

      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await userService.signout()
      }

      let registerUser = async user => {
        let userId = await userService.signup({
          mobile: user.mobile,
          password: user.password,
          verify_code: '123133',
        })
        user.id = userId
        await userService.signout()
        return user
      }

      user1 = await registerUser({
        mobile: '1' + app.util.randomInt(10),
        password: '123456',
      })

      user2 = await registerUser({
        mobile: '1' + app.util.randomInt(10),
        password: '123456',
      })

      user3 = await registerUser({
        mobile: '1' + app.util.randomInt(10),
        password: '123456',
      })

    })

    it('activity blocked getter/setter', async () => {

      const ctx = app.mockContext()
      const { account, privacy } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      let list = await privacy.activityBlocked.getBlockedUserListByUserId(user1.id)
      assert(list.length === 0)

      let errorCount = 0
      try {
        // 只能修改自己的，所以要登录态
        await privacy.activityBlocked.setBlockedUserList([user2.id, user3.id])
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
        errorCount++
      }

      assert(errorCount === 1)

      await userService.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      try {
        // 不存在的 user id 不能设置
        await privacy.activityBlocked.setBlockedUserList([user2.id, '112312312321398123123123'])
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 2)

      try {
        // 自己的 id 不能设置
        await privacy.activityBlocked.setBlockedUserList([user2.id, user1.id])
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
        errorCount++
      }

      assert(errorCount === 3)

      await privacy.activityBlocked.setBlockedUserList([user2.id, user3.id])

      list = await privacy.activityBlocked.getBlockedUserListByUserId(user1.id)
      assert(list.length === 2)

      // 清空
      await privacy.activityBlocked.setBlockedUserList([])

      list = await privacy.activityBlocked.getBlockedUserListByUserId(user1.id)
      assert(list.length === 0)

    })


  })
})