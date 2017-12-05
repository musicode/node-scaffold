
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/project/consult.test.js', () => {

  describe('consult service', () => {

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

    it('consult crud', async () => {

      const ctx = app.mockContext()
      const { account, project, trace } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      // user1 发表项目
      currentUser = await account.user.signin({
        mobile: user1.mobile,
        password: user1.password,
      })

      let errorCount = 0

      let title = '123456789'
      let content = 'hahahahahahahahahahhaahhahahahahahahahahahahahahahahhaahhahahahaha'

      let demandId = await project.demand.createDemand({
        title,
        content,
      })

      // 创作数量（不记入创作）
      let writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 0)

      // 咨询数量
      let consultCount = await project.consult.getConsultCount({
        demand_id: demandId,
      })
      assert(consultCount === 0)

      // 咨询列表
      let consultList = await project.consult.getConsultList(
        {
          demand_id: demandId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(consultList.length === 0)


      // 作者自己发表咨询
      let consultId = await project.consult.createConsult({
        demand_id: demandId,
        content,
      })

      // 咨询不参与计数
      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 0)

      consultCount = await project.consult.getConsultCount({
        demand_id: demandId,
      })
      assert(consultCount === 1)

      consultList = await project.consult.getConsultList(
        {
          demand_id: demandId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(consultList.length === 1)




      // 各种获取咨询
      let consult = await project.consult.getConsultById(consultId)
      assert(app.util.type(consult) === 'object')
      assert(consult.id === consultId)
      assert(consult.content === undefined)

      consult = await project.consult.getConsultById(consult)
      assert(app.util.type(consult) === 'object')
      assert(consult.id === consultId)
      assert(consult.content === undefined)

      consult = await project.consult.checkConsultAvailableById(consultId)
      assert(app.util.type(consult) === 'object')
      assert(consult.id === consultId)
      assert(consult.content === undefined)

      consult = await project.consult.checkConsultAvailableById(consult)
      assert(app.util.type(consult) === 'object')
      assert(consult.id === consultId)
      assert(consult.content === undefined)

      consult = await project.consult.getFullConsultById(consult)
      assert(app.util.type(consult) === 'object')
      assert(consult.content === content)
      assert(consult.create_time.getTime() === consult.update_time.getTime())


      // 修改咨询
      let newContent = '213123213213123213213123213213123213213123213'

      await new Promise(resolve => {

        setTimeout(
          async () => {

            await project.consult.updateConsultById({ content: newContent }, consultId)

            consult = await project.consult.getConsultById(consultId)
            assert(app.util.type(consult) === 'object')
            assert(consult.content === undefined)

            assert(consult.create_time.getTime() === consult.update_time.getTime())

            consult = await project.consult.getFullConsultById(consultId)
            assert(consult.content === newContent)
            assert(consult.create_time.getTime() < consult.update_time.getTime())

            resolve()
          },
          1000
        )
      })


      newContent = 'aaa213123213213123213213123213213123213213123213123'

      // 支持 consult 对象，节省一次查询
      await project.consult.updateConsultById({ content: newContent }, consult)

      consult = await project.consult.getConsultById(consultId)
      assert(app.util.type(consult) === 'object')
      assert(consult.content === undefined)

      consult = await project.consult.getFullConsultById(consultId)
      assert(consult.content === newContent)



      let parentId = consultId
      // 咨询
      consultId = await project.consult.createConsult({
        demand_id: demandId,
        parent_id: parentId,
        content,
      })

      assert(app.util.type(consultId) === 'number')

      consultCount = await project.consult.getConsultCount({
        demand_id: demandId,
      })
      assert(consultCount === 2)

      let subCount = await project.demand.getDemandSubCount(demandId)
      assert(consultCount === 2)

      consultCount = await project.consult.getConsultCount({
        parent_id: parentId,
      })
      assert(consultCount === 1)

      subCount = await project.consult.getConsultSubCount(demandId)
      assert(consultCount === 1)


      try {
        await project.demand.deleteDemand(demandId)
      }
      catch (err) {
        assert(err.code === app.code.PERMISSION_DENIED)
        errorCount++
      }
      assert(errorCount === 1)


      try {
        await project.consult.deleteConsult(parentId)
      }
      catch (err) {
        assert(err.code === app.code.PERMISSION_DENIED)
        errorCount++
      }
      assert(errorCount === 2)


      await project.consult.deleteConsult(consultId)


      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 0)

      consultCount = await project.consult.getConsultCount({
        demand_id: demandId,
      })
      assert(consultCount === 1)

      consultList = await project.consult.getConsultList(
        {
          demand_id: demandId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(consultList.length === 1)


      consult = await project.consult.checkConsultAvailableById(consultId)
      assert(app.util.type(consult) === 'object')

      try {
        await project.consult.checkConsultAvailableById(consultId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }
      assert(errorCount === 3)





      await project.consult.deleteConsult(parentId)


      writeCount = await account.user.getUserWriteCount(currentUser.id)
      assert(writeCount === 0)

      consultCount = await project.consult.getConsultCount({
        demand_id: demandId,
      })
      assert(consultCount === 0)

      consultList = await project.consult.getConsultList(
        {
          demand_id: demandId,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(consultList.length === 0)



      await project.demand.deleteDemand(demandId)


    })


  })
})