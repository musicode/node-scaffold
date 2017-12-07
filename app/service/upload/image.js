
'use strict'

const sizeOf = require('image-size')
const BaseUploadService = require('./base')

module.exports = app => {

  const { code, config } = app

  class ImageUpload extends BaseUploadService {

    get tableName() {
      return 'file_image'
    }

    get fields() {
      return [
        'name', 'url', 'width', 'height', 'size', 'status', 'user_id',
      ]
    }

    get bucketName() {
      return config.qiniu.imageBucket
    }

    get cdnDomain() {
      return config.qiniu.imageCdnDomain
    }

    async addImage(file) {

      // 1KB - 20M
      this.checkFile(file, {
        mimeTypes: ['image/*'],
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

        const { width, height } = await sizeOf(file.path)
        record.width = width
        record.height = height
        record.user_id = userId

        await this.insert(record)
      }

      return {
        url: record.url,
        width: record.width,
        height: record.height,
        size: record.size,
      }

    }

  }
  return ImageUpload
}