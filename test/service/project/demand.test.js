
const { app, mock, assert } = require('egg-mock/bootstrap')

describe('test/service/project/demand.test.js', () => {

  describe('demand service', () => {

    let user

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

      user = await registerUser({
        mobile: '1' + app.util.randomInt(10),
        password: '123456',
      })

    })

    it('demand crud', async () => {

      const ctx = app.mockContext()
      const { account, project, trace } = ctx.service
      const userService = account.user

      // 从未登录测起
      let currentUser = await account.session.getCurrentUser()
      if (currentUser) {
        await account.user.signout()
      }

      let errorCount = 0

      let title = '123456789'
      let content = 'hahahahahahahahahahhaahhahahahahahahahahahahahahahahhaahhahahahaha'

      // 参数必须要有 content
      try {
        await project.demand.createDemand({
          title,
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
        errorCount++
      }

      assert(errorCount === 1)

      // 参数必须要有 title
      try {
        await project.demand.createDemand({
          content,
        })
      }
      catch (err) {
        assert(err.code === app.code.PARAM_INVALID)
        errorCount++
      }

      assert(errorCount === 2)

      // 发表项目必须登录
      try {
        await project.demand.createDemand({
          title,
          content,
        })
      }
      catch (err) {
        assert(err.code === app.code.AUTH_UNSIGNIN)
        errorCount++
      }

      assert(errorCount === 3)

      currentUser = await account.user.signin({
        mobile: user.mobile,
        password: user.password,
      })

      // 创作数量
      let writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      // 项目数量
      let demandCount = await project.demand.getDemandCount({
        user_id: currentUser.id,
      })
      assert(demandCount === 0)

      let demandList = await project.demand.getDemandList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(demandList.length === 0)

      let demandId = await project.demand.createDemand({
        title,
        content,
      })

      assert(app.util.type(demandId) === 'number')

      // 项目不记入创作
      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      demandCount = await project.demand.getDemandCount({
        user_id: currentUser.id,
      })
      assert(demandCount === 1)

      demandList = await project.demand.getDemandList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(demandList.length === 1)


      let demand = await project.demand.getDemandById(demandId)
      assert(app.util.type(demand) === 'object')
      assert(demand.id === demandId)
      assert(demand.content === undefined)

      demand = await project.demand.getDemandById(demand)
      assert(app.util.type(demand) === 'object')
      assert(demand.id === demandId)
      assert(demand.content === undefined)

      demand = await project.demand.checkDemandAvailableById(demandId)
      assert(app.util.type(demand) === 'object')
      assert(demand.id === demandId)
      assert(demand.content === undefined)

      demand = await project.demand.checkDemandAvailableById(demand)
      assert(app.util.type(demand) === 'object')
      assert(demand.id === demandId)
      assert(demand.content === undefined)

      assert(demand.title === title)

      demand = await project.demand.getFullDemandById(demand)
      assert(app.util.type(demand) === 'object')
      assert(demand.content === content)
      assert(demand.create_time.getTime() === demand.update_time.getTime())



      // 修改项目
      let newTitle = 'newtitle'
      let newContent = '213123213213123213213123213213123213213123213'

      await new Promise(resolve => {

        setTimeout(
          async () => {

            await project.demand.updateDemandById({ title: newTitle, content: newContent }, demandId)

            demand = await project.demand.getDemandById(demandId)
            assert(app.util.type(demand) === 'object')

            assert(demand.title === newTitle)
            assert(demand.content === undefined)

            const createTime = demand.create_time
            const updateTime = demand.update_time

            assert(createTime.getTime() < updateTime.getTime())


            setTimeout(
              async () => {

                let content = '123haha'
                await project.demand.updateDemandById({ content }, demandId)

                demand = await project.demand.getFullDemandById(demandId)
                assert(demand.content === content)
                assert(updateTime.getTime() < demand.update_time.getTime())

                resolve()

              },
              1000
            )
          },
          1000
        )
      })




      newTitle = 'newtitle11'
      newContent = '213123213213123213213123213213123213213123213123'

      // 支持 demand 对象，节省一次查询
      await project.demand.updateDemandById({ title: newTitle, content: newContent }, demand)

      demand = await project.demand.getDemandById(demandId)
      assert(app.util.type(demand) === 'object')

      assert(demand.title === newTitle)
      assert(demand.content === undefined)





      await project.demand.deleteDemand(demandId)

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      demandCount = await project.demand.getDemandCount({
        user_id: currentUser.id,
      })
      assert(demandCount === 0)

      demandList = await project.demand.getDemandList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(demandList.length === 0)


      demand = await project.demand.checkDemandAvailableById(demandId)
      assert(app.util.type(demand) === 'object')

      try {
        await project.demand.checkDemandAvailableById(demandId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 4)


      demandId = await project.demand.createDemand({
        title,
        content,
      })

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      demandCount = await project.demand.getDemandCount({
        user_id: currentUser.id,
      })
      assert(demandCount === 1)

      demandList = await project.demand.getDemandList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(demandList.length === 1)

      demand = await project.demand.checkDemandAvailableById(demandId)
      assert(app.util.type(demand) === 'object')


      // 支持 demand 对象删除，节省一次查询
      await project.demand.deleteDemand(demand)

      writeCount = await account.user.getUserWriteCount(user.id)
      assert(writeCount === 0)

      demandCount = await project.demand.getDemandCount({
        user_id: currentUser.id,
      })
      assert(demandCount === 0)

      demandList = await project.demand.getDemandList(
        {
          user_id: currentUser.id,
        },
        {
          page: 0,
          page_size: 10000,
        }
      )
      assert(demandList.length === 0)

      try {
        await project.demand.checkDemandAvailableById(demandId, true)
      }
      catch (err) {
        assert(err.code === app.code.RESOURCE_NOT_FOUND)
        errorCount++
      }

      assert(errorCount === 5)


    })


  })
})