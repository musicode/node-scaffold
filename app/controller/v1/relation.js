'use strict'

module.exports = app => {

  const { util } = app

  class RelationController extends app.BaseController {

    async checkUser() {
      const input = this.filter(this.input, {
        user_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
      })

      const { account } = this.ctx.service

      return await account.user.checkUserAvailableByNumber(input.user_id)

    }

    async follow() {

      const { relation } = this.ctx.service

      const user = await this.checkUser()

      await relation.followee.followUser(user.id)

    }

    async unfollow() {

      const { relation } = this.ctx.service

      const user = await this.checkUser()

      await relation.followee.unfollowUser(user.id)

    }

    async is() {

      const input = this.filter(this.input, {
        user_id: 'trim',
        target_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
        target_id: 'string',
      })

      const { account, relation } = this.ctx.service
      const user = await account.user.checkUserAvailableByNumber(input.user_id)
      const target = await account.user.checkUserAvailableByNumber(input.target_id)

      const isFolowee = await relation.followee.hasFollow(user.id, target.id)
      const isFolower = await relation.followee.hasFollow(target.id, user.id)

      this.output.is_followee = isFolowee
      this.output.is_follower = isFolower
      this.output.is_friend = isFolowee && isFolower

    }

    async followeeCount() {

      const { relation } = this.ctx.service

      const user = await this.checkUser()

      this.output.count = await relation.followee.getFolloweeCount(user.id)

    }

    async followeeList() {

      const input = this.filter(this.input, {
        user_id: 'trim',
        page: 'number',
        page_size: 'number',
        sort_by: 'trim',
        sort_order: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order',
        },
      })


      const { account, relation } = this.ctx.service

      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      const list = await relation.followee.getFolloweeList(
        user.id,
        {
          page: input.page,
          page_size: input.page_size,
          sort_by: input.sort_by || 'update_time',
          sort_order: input.sort_order || 'desc'
        }
      )

      await util.each(
        list,
        async item => {

          const followee = await account.user.getFullUserById(item.followee_id)
          const isFollower = await relation.followee.hasFollow(followee.id, user.id)

          delete item.user_id
          delete item.followee_id

          item.user = await account.user.toExternal(followee)
          item.create_time = item.update_time
          item.is_followee = true
          item.is_follower = isFollower

        }
      )

      const count = await relation.follower.getFollowerCount(user.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async followerCount() {

      const { relation } = this.ctx.service

      const user = await this.checkUser()

      this.output.count = await relation.follower.getFollowerCount(user.id)

    }

    async followerList() {

      const input = this.filter(this.input, {
        user_id: 'trim',
        page: 'number',
        page_size: 'number',
        sort_by: 'trim',
        sort_order: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order',
        },
      })


      const { account, relation } = this.ctx.service

      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      const list = await relation.follower.getFollowerList(
        user.id,
        {
          page: input.page,
          page_size: input.page_size,
          sort_by: input.sort_by || 'update_time',
          sort_order: input.sort_order || 'desc'
        }
      )

      await util.each(
        list,
        async item => {

          const follower = await account.user.getFullUserById(item.follower_id)
          const isFollowee = await relation.followee.hasFollow(user.id, follower.id)

          delete item.user_id
          delete item.follower_id

          item.user = await account.user.toExternal(follower)
          item.create_time = item.update_time
          item.is_followee = isFollowee
          item.is_follower = true

        }
      )

      const count = await relation.follower.getFollowerCount(user.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async friendCount() {

      const { relation } = this.ctx.service

      const user = await this.checkUser()

      this.output.count = await relation.friend.getFriendCount(user.id)

    }

    async friendList() {

      const input = this.filter(this.input, {
        user_id: 'number',
        page: 'number',
        page_size: 'number',
        sort_by: 'trim',
        sort_order: 'trim',
      })

      this.validate(input, {
        user_id: 'number',
        page: 'page',
        page_size: 'page_size',
        sort_by: {
          required: false,
          type: 'sort_by',
        },
        sort_order: {
          required: false,
          type: 'sort_order',
        },
      })


      const { account, relation } = this.ctx.service

      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      const list = await relation.friend.getFriendList(user.id)

      await util.each(
        list,
        async (item, index) => {

          const friend = await account.user.getFullUserById(item.friend_id)

          list[ index ] = await account.user.toExternal(friend)

        }
      )

      const count = await relation.friend.getFriendCount(user.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

  }

  return RelationController

}