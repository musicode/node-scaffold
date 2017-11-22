/**
 * 全局事件中心
 */

'use strict'

const eventEmitter = new require('events').EventEmitter

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


module.exports = eventEmitter