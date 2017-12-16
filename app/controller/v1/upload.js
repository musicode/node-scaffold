'use strict'

const formidable = require('formidable')

module.exports = app => {

  const { util, config } = app

  class UploadController extends app.BaseController {

    async uploading() {

      const form = new formidable.IncomingForm()

      form.hash = 'md5'
      form.keepExtensions = true
      form.maxFieldsSize = 50 * 1024 * 1024
      if (config.upload.dir) {
        form.uploadDir = config.upload.dir
      }

      return new Promise(resolve => {

        const { ctx } = this

        form.parse(
          ctx.req,
          (err, fields, files) => {
            if (err) {
              throw err
            }
            if (fields && fields.access_token) {
              ctx.accessToken = fields.access_token
            }
            resolve({
              fields,
              files,
            })
          }
        )

      })

    }

    async image() {

      const { files } = await this.uploading()

      const { upload } = this.ctx.service

      this.output = await upload.image.addImage(files.file)

    }

    async audio() {

      const { fields, files } = await this.uploading()

      const { upload } = this.ctx.service

      this.output = await upload.audio.addAudio(files.file, fields.duration)

    }

    async video() {

      const { fields, files } = await this.uploading()

      const { upload } = this.ctx.service

      this.output = await upload.video.addVideo(files.file, fields.duration)

    }

  }

  return UploadController

}