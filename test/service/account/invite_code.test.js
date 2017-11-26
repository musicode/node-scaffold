
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/invite_code.test.js', () => {

  describe('inviteCode service', () => {

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

    it('crud invite code', async () => {

      const ctx = app.mockContext()
      const { account } = ctx.service

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      let inviteCodeCount = 0
      let errorCount = 0

      // 未登录，申请邀请码会报错
      try {
        await account.inviteCode.createInviteCode()
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
        errorCount++
      }

      assert(errorCount === 1)

      currentUser = await account.user.signin({
        mobile: user.mobile,
        password: user.password,
      })

      // 开始连续申请邀请码
      for (let i = 0; i < app.limit.INVITE_CODE_MAX_COUNT_PER_USER; i++) {
        await account.inviteCode.createInviteCode()
        inviteCodeCount++
      }

      // 再申请就超过上限了
      try {
        await account.inviteCode.createInviteCode()
      }
      catch (err) {
        assert(err.code === app.code.PERMISSION_DENIED)
        errorCount++
      }

      assert(errorCount === 2)
      assert(inviteCodeCount === app.limit.INVITE_CODE_MAX_COUNT_PER_USER)

      let inviteCodeList = await account.inviteCode.getInviteCodeListByUserId(currentUser.id)
      assert(inviteCodeList.length === inviteCodeCount)

    })

  })
})