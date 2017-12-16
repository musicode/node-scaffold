
'use strict'

const fs = require('fs')
const BaseUploadService = require('./base')

module.exports = app => {

  const { code, util, config } = app

  class VideoUpload extends BaseUploadService {

    get tableName() {
      return 'file_video'
    }

    get fields() {
      return [
        'name', 'url', 'duration', 'size', 'status', 'user_id',
      ]
    }

    get bucketName() {
      return config.qiniu.videoBucket
    }

    get cdnDomain() {
      return config.qiniu.videoCdnDomain
    }

    async addVideo(file, duration) {

      // 1KB - 20M
      this.checkFile(file, {
        mimeTypes: ['video/*'],
        minSize: 1,
        maxSize: 20 * 1024,
      })

      const fileName = this.getFileName(file)

      let record = await this.findOneBy({ name: fileName })

      const { account } = this.service
      const currentUser = await account.session.getCurrentUser()
      const userId = currentUser ? currentUser.id : 0

      if (record) {
        record.user_id = userId
        const fields = this.getFields(record)
        await this.insert(fields)
      }
      else {
        record = await this.uploadToCloud(file)

        record.duration = duration > 0 ? duration : 0
        record.user_id = userId

        await this.insert(record)
      }

      // 删除源文件
      // fs.unlink(
      //   file.path,
      //   err => {
      //     throw err
      //   }
      // )

      return {
        url: record.url,
        size: record.size,
        duration: util.toNumber(record.duration),
      }

    }

  }
  return VideoUpload
}