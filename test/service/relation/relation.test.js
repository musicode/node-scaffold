
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/relation/relation.test.js', () => {

  describe('relation service', () => {

    let user1
    let user2

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

    })

    it('relation crud', async () => {

      const ctx = app.mockContext()
      const { account, article, relation } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }


      // user2 关注 user1

      let errorCount = 0

      // 关注必须先登录
      try {
        await relation.followee.followUser(user1.id)
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
        errorCount++
      }
      assert(errorCount === 1)


      currentUser = await account.user.signin({
        mobile: user2.mobile,
        password: user2.password,
      })

      let hasFollow = await relation.followee.hasFollow(user2.id, user1.id)
      assert(hasFollow === false)

      let followeeCount = await relation.followee.getFolloweeCount(user2.id)
      assert(followeeCount === 0)

      let followeeList = await relation.followee.getFolloweeList(user2.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followeeList.length === 0)

      let followerCount = await relation.follower.getFollowerCount(user1.id)
      assert(followerCount === 0)

      let followerList = await relation.follower.getFollowerList(user1.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followerList.length === 0)

      let friendCount = await relation.friend.getFriendCount(user1.id)
      assert(friendCount === 0)

      let friendList = await relation.friend.getFriendList(user1.id)
      assert(friendList.length === 0)



      await relation.followee.followUser(user1.id)



      hasFollow = await relation.followee.hasFollow(user2.id, user1.id)
      assert(hasFollow === true)

      followeeCount = await relation.followee.getFolloweeCount(user2.id)
      assert(followeeCount === 1)

      followeeList = await relation.followee.getFolloweeList(user2.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followeeList.length === 1)

      followerCount = await relation.follower.getFollowerCount(user1.id)
      assert(followerCount === 1)

      followerList = await relation.follower.getFollowerList(user1.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followerList.length === 1)

      friendCount = await relation.friend.getFriendCount(user1.id)
      assert(friendCount === 0)

      friendList = await relation.friend.getFriendList(user1.id)
      assert(friendList.length === 0)



      await relation.followee.unfollowUser(user1.id)



      hasFollow = await relation.followee.hasFollow(user2.id, user1.id)
      assert(hasFollow === false)

      followeeCount = await relation.followee.getFolloweeCount(user2.id)
      assert(followeeCount === 0)

      followeeList = await relation.followee.getFolloweeList(user2.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followeeList.length === 0)

      followerCount = await relation.follower.getFollowerCount(user1.id)
      assert(followerCount === 0)

      followerList = await relation.follower.getFollowerList(user1.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followerList.length === 0)

      friendCount = await relation.friend.getFriendCount(user1.id)
      assert(friendCount === 0)

      friendList = await relation.friend.getFriendList(user1.id)
      assert(friendList.length === 0)



      await relation.followee.followUser(user1.id)



      // 互相关注
      await userService.signout()

      currentUser = await account.user.signin({
        mobile: user1.mobile,
        password: user1.password,
      })


      hasFollow = await relation.followee.hasFollow(user1.id, user2.id)
      assert(hasFollow === false)

      followeeCount = await relation.followee.getFolloweeCount(user1.id)
      assert(followeeCount === 0)

      followeeList = await relation.followee.getFolloweeList(user1.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followeeList.length === 0)

      followerCount = await relation.follower.getFollowerCount(user2.id)
      assert(followerCount === 0)

      followerList = await relation.follower.getFollowerList(user2.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followerList.length === 0)

      friendCount = await relation.friend.getFriendCount(user1.id)
      assert(friendCount === 0)

      friendList = await relation.friend.getFriendList(user1.id)
      assert(friendList.length === 0)




      await relation.followee.followUser(user2.id)



      hasFollow = await relation.followee.hasFollow(user1.id, user2.id)
      assert(hasFollow === true)

      followeeCount = await relation.followee.getFolloweeCount(user1.id)
      assert(followeeCount === 1)

      followeeList = await relation.followee.getFolloweeList(user1.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followeeList.length === 1)

      followerCount = await relation.follower.getFollowerCount(user2.id)
      assert(followerCount === 1)

      followerList = await relation.follower.getFollowerList(user2.id, {
        page: 0,
        page_size: 1000,
      })
      assert(followerList.length === 1)

      friendCount = await relation.friend.getFriendCount(user1.id)
      assert(friendCount === 1)

      friendList = await relation.friend.getFriendList(user1.id)
      assert(friendList.length === 1)


    })


  })
})