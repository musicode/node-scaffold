/**
 * 全局事件中心
 */

'use strict'

const events = require('events')
const eventEmitter = new events.EventEmitter()


eventEmitter.USER_CREATE = 'user_create'
eventEmitter.USER_UPDATE = 'user_update'


eventEmitter.POST_CREATE = 'post_create'
eventEmitter.POST_UPDATE = 'post_update'

eventEmitter.COMMENT_CREATE = 'comment_create'
eventEmitter.COMMENT_UPDATE = 'comment_update'

eventEmitter.DEMAND_CREATE = 'demand_create'
eventEmitter.DEMAND_UPDATE = 'demand_update'

eventEmitter.CONSULT_CREATE = 'consult_create'
eventEmitter.CONSULT_UPDATE = 'consult_update'

eventEmitter.QUESTION_CREATE = 'question_create'
eventEmitter.QUESTION_UPDATE = 'question_update'

eventEmitter.REPLY_CREATE = 'reply_create'
eventEmitter.REPLY_UPDATE = 'reply_update'

module.exports = eventEmitter