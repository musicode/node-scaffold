'use strict'

module.exports = app => {

  class RelationController extends app.BaseController {

    async follow() {

      const input = this.filter(this.input, {
        user_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
      })

      const { account, relation } = this.ctx.service

      const user = await account.user.getUserByNumber(input.user_id)

      await relation.followee.followUser(user.id)

    }

    async unfollow() {

      const input = this.filter(this.input, {
        user_id: 'trim',
      })

      this.validate(input, {
        user_id: 'string',
      })

      const { account, relation } = this.ctx.service

      const user = await account.user.getUserByNumber(input.user_id)

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
      const user = await account.user.getUserByNumber(input.user_id)
      const target = await account.user.getUserByNumber(input.target_id)

      const isFolowee = await relation.followee.hasFollow(user.id, target.id)
      const isFolower = await relation.followee.hasFollow(target.id, user.id)

      this.output.is_followee = isFolowee
      this.output.is_follower = isFolower
      this.output.is_friend = isFolowee && isFolower

    }

  }

  return RelationController

}