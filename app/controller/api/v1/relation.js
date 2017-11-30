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

      this.output.count = await relation.followee.countByUserId(user.id)

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
        page: 'number',
        page_size: 'number',
        sort_by: {
          required: false,
          allowEmpty: true,
          type: 'string',
        },
        sort_order: {
          required: false,
          allowEmpty: true,
          type: 'string',
        },
      })


      const { account, relation } = this.ctx.service

      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      const list = await relation.followee.findByUserId(
        user.id,
        {
          page: input.page,
          pageSize: input.page_size,
          sortBy: input.sort_by || 'update_time',
          sortOrder: input.sort_order || 'desc'
        }
      )

      await util.each(
        list,
        async item => {

          const followee = await account.user.getUserById(item.followee_id)
          const isFollower = await relation.followee.hasFollow(followee.id, user.id)

          delete item.user_id
          delete item.followee_id

          item.user = account.user.toExternal(followee)
          item.create_time = item.update_time
          item.is_followee = true
          item.is_follower = isFollower

        }
      )

      const count = await relation.followee.countByUserId(user.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)

    }

    async followerCount() {

      const { relation } = this.ctx.service

      const user = await this.checkUser()

      this.output.count = await relation.follower.countByUserId(user.id)

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
        page: 'number',
        page_size: 'number',
        sort_by: {
          required: false,
          allowEmpty: true,
          type: 'string',
        },
        sort_order: {
          required: false,
          allowEmpty: true,
          type: 'string',
        },
      })


      const { account, relation } = this.ctx.service

      const user = await account.user.checkUserAvailableByNumber(input.user_id)

      const list = await relation.follower.findByUserId(
        user.id,
        {
          page: input.page,
          pageSize: input.page_size,
          sortBy: input.sort_by || 'update_time',
          sortOrder: input.sort_order || 'desc'
        }
      )

      await util.each(
        list,
        async item => {

          const follower = await account.user.getUserById(item.follower_id)
          const isFollowee = await relation.followee.hasFollow(user.id, follower.id)

          delete item.user_id
          delete item.follower_id

          item.user = account.user.toExternal(follower)
          item.create_time = item.update_time
          item.is_followee = isFollowee
          item.is_follower = true

        }
      )

      const count = await relation.follower.countByUserId(user.id)

      this.output.list = list
      this.output.pager = this.createPager(input, count)


    }

  }

  return RelationController

}