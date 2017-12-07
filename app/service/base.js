
const Service = require('egg').Service

class BaseService extends Service {

  async query(sql, args) {
    return await this.app.mysql.query(sql, args)
  }

  async queryOne(sql, args) {
    return await this.app.mysql.queryOne(sql, args)
  }

  async findOneBy(where) {
    return await this.app.mysql.get(this.tableName, where)
  }

  async findBy(options) {

    const data = { where: options.where }

    if (options.page > 0 && options.page_size > 0) {
      data.offset = (options.page - 1) * options.page_size
      data.limit = options.page_size
    }

    if (options.sort_by && options.sort_order) {
      data.orders = [[options.sort_by, options.sort_order]]
    }

    return this.app.mysql.select(this.tableName, data)

  }

  async countBy(where) {
    return this.app.mysql.count(this.tableName, where)
  }

  getFields(data) {
    let fields = { }

    this.fields.forEach(
      field => {
        if (field in data) {
          fields[field] = data[field]
        }
      }
    )

    if (Object.keys(fields).length) {
      return fields
    }
  }

  async createNumber(length) {
    let number
    while (number = this.app.util.randomInt(length)) {
      let record = await this.findOneBy({ number })
      if (!record) {
        return number
      }
    }
  }

  async insert(data) {
    const result = await this.app.mysql.insert(
      this.tableName,
      data
    )
    if (result.affectedRows === 1) {
      return result.insertId
    }
  }

  async update(data, where) {
    const result = await this.app.mysql.update(
      this.tableName,
      data,
      {
        where,
      }
    )
    return result.affectedRows
  }

  async delete(where) {
    const result = await this.app.mysql.delete(
      this.tableName,
      where
    )
    return result.affectedRows
  }

  async transaction(handler) {
    return await this.app.mysql.beginTransactionScope(
      handler,
      this.ctx
    )
  }

  async updateRedis(key, fields) {

    const { util, redis, mysql } = this.app
    const value = await redis.get(key)

    if (value) {
      const object = util.parseObject(value)
      Object.assign(object, fields)
      if (object.update_time) {
        object.update_time = new Date()
      }
      await redis.set(key, util.stringifyObject(object))
    }

  }

  /**
   * 抛出一个逻辑异常
   *
   * @param {number} code
   * @param {string} message
   */
  throw(code, message) {
    this.app.util.throw(code, message)
  }

}

module.exports = BaseService
