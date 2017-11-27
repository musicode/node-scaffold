
const eventEmitter = require('./eventEmitter')

eventEmitter
.on(
  eventEmitter.USER_UPDATE,
  data => {

    const { userId, fields } = data


  }
)