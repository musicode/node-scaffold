'use strict'

const formidable = require('formidable')

module.exports = app => {

  const { util } = app

  class UploadController extends app.BaseController {

    async uploading() {

      const form = new formidable.IncomingForm()

      form.hash = 'md5'
      form.keepExtensions = true

      return new Promise(resolve => {

        form.parse(
          this.ctx.req,
          (err, fields, files) => {
            if (err) {
              throw err
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

      const { upload } = this.ctx.service

      const { files } = await this.uploading()

      this.output = await upload.image.addImage(files.upload)

    }

  }

  return UploadController

}