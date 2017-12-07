
'use strict'

const fs = require('fs')
const path = require('path')
const qiniu = require('qiniu')

const BaseService = require('../base')

/**
 * const { name, type, path, hash, size } = file
 *
 * name: 文件名
 * type: mime type
 * path: 文件路径
 * hash: md5 hash 值
 * size: 文件字节数
 */

class BaseUploadService extends BaseService {

  checkFile(file, rules) {

    const { code, util } = this.app

    if (!file) {
      this.throw(
        code.PARAM_INVALID,
        '缺少上传文件'
      )
    }

    const { minSize, maxSize, mimeTypes } = rules

    const fileSize = file.size / 1024

    if (!fileSize) {
      this.throw(
        code.PARAM_INVALID,
        `文件大小不能为 0`
      )
    }

    if (minSize > 0 && fileSize < minSize) {
      this.throw(
        code.PARAM_INVALID,
        `文件不能小于${minSize}KB`
      )
    }
    else if (maxSize > 0 && fileSize > maxSize) {
      this.throw(
        code.PARAM_INVALID,
        `文件不能超过${maxSize}KB`
      )
    }

    if (util.type(mimeTypes) === 'array') {
      console.log(mimeTypes, file.type )
      util.each(
        mimeTypes,
        mimeType => {
          let [ type, subType ] = mimeType.split('/')
          if (subType === '*') {
            subType = '.+'
          }
          const pattern = new RegExp(`^${type}/${subType}$`)
          if (!pattern.test(file.type)) {
            this.throw(
              code.PARAM_INVALID,
              '文件格式错误'
            )
          }
        }
      )
    }

  }

  getFileHash(file) {
    return file.hash.substr(0, 10)
  }

  getFileName(file) {
    return this.getFileHash(file) + path.extname(file.path)
  }

  getFileCloudUrl(file) {
    // 不用加协议，省的客户端麻烦
    return '//' + this.cdnDomain + '/' + this.getFileName(file)
  }

  async uploadToCloud(file) {

    let { code, util, config } = this.app

    const { accessKey, secretKey, zone } = config.qiniu

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)

    const putPolicy = new qiniu.rs.PutPolicy({
      scope: this.bucketName,
      expires: 7200, // 2 小时过期
    })

    // https://developer.qiniu.com/kodo/sdk/1289/nodejs#server-upload
    config = new qiniu.conf.Config()

    // 空间对应的机房
    config.zone = zone

    const formUploader = new qiniu.form_up.FormUploader(config)

    const fileName = this.getFileName(file)

    return new Promise(resolve => {

      formUploader.putStream(
        putPolicy.uploadToken(mac),
        fileName,
        fs.createReadStream(file.path),
        new qiniu.form_up.PutExtra(),
        (err, body, info) => {

          // 删除源文件，无需等待
          fs.unlink(file.path)

          if (err) {
            throw err
          }

          if (info.statusCode == 200) {
            resolve({
              name: fileName,
              url: this.getFileCloudUrl(file),
              size: file.size,
            })
          }
          else {
            this.throw(
              code.OUTER_ERROR,
              '文件上传到云端失败'
            )
          }
        }
      )

    })

  }

}

module.exports = BaseUploadService
