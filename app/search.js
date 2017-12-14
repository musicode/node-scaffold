
const eventEmitter = require('./eventEmitter')


async function upsertUser(data) {

  const { userId, service } = data

  const user = await service.account.user.getFullUserById(userId)

  service.search.upsert(
    'account',
    user
  )
}

async function upsertPost(data) {

  const { postId, service } = data

  const post = await service.article.post.getFullPostById(postId)

  service.search.upsert(
    'post',
    post
  )
}

async function upsertComment(data) {

  const { commentId, service } = data

  const comment = await service.article.comment.getFullCommentById(commentId)

  service.search.upsert(
    'comment',
    comment
  )
}

async function upsertDemand(data) {

  const { demandId, service } = data

  const demand = await service.project.demand.getFullDemandById(demandId)

  service.search.upsert(
    'demand',
    demand
  )
}

async function upsertConsult(data) {

  const { consultId, service } = data

  const consult = await service.project.consult.getFullConsultById(consultId)

  service.search.upsert(
    'consult',
    consult
  )
}

async function upsertQuestion(data) {

  const { questionId, service } = data

  const question = await service.qa.question.getFullQuestionById(questionId)

  service.search.upsert(
    'question',
    question
  )
}

async function upsertReply(data) {

  const { replyId, service } = data

  const reply = await service.qa.reply.getFullReplyById(replyId)
  reply.view_count = 0

  service.search.upsert(
    'reply',
    reply
  )
}

eventEmitter
  .on(
    eventEmitter.USER_CREATE,
    upsertUser
  )
  .on(
    eventEmitter.USER_UPDATE,
    upsertUser
  )
  .on(
    eventEmitter.POST_CREATE,
    upsertPost
  )
  .on(
    eventEmitter.POST_UPDATE,
    upsertPost
  )
  .on(
    eventEmitter.COMMENT_CREATE,
    upsertComment
  )
  .on(
    eventEmitter.COMMENT_UPDATE,
    upsertComment
  )
  .on(
    eventEmitter.DEMAND_CREATE,
    upsertDemand
  )
  .on(
    eventEmitter.DEMAND_UPDATE,
    upsertDemand
  )
  .on(
    eventEmitter.CONSULT_CREATE,
    upsertConsult
  )
  .on(
    eventEmitter.CONSULT_UPDATE,
    upsertConsult
  )
  .on(
    eventEmitter.QUESTION_CREATE,
    upsertQuestion
  )
  .on(
    eventEmitter.QUESTION_UPDATE,
    upsertQuestion
  )
  .on(
    eventEmitter.REPLY_CREATE,
    upsertReply
  )
  .on(
    eventEmitter.REPLY_UPDATE,
    upsertReply
  )