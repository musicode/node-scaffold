/**
 * 全局事件中心
 */

'use strict'

const events = require('events')
const eventEmitter = new events.EventEmitter()

/**
* 用户注册
*/
eventEmitter.USER_SIGN_UP = 'user_sign_up'

/**
* 用户登录
*/
eventEmitter.USER_SIGN_IN = 'user_sign_in'

/**
* 用户登出
*/
eventEmitter.USER_SIGN_OUT = 'user_sign_out'

/**
* 用户修改个人资料
*/
eventEmitter.USER_UPDATE = 'user_update'


eventEmitter.POST_ADD = 'post_add'
eventEmitter.POST_UPDATE = 'post_update'

eventEmitter.POST_LIKE = 'post_like'
eventEmitter.POST_UNLIKE = 'post_unlike'

module.exports = eventEmitter