import { ElmapiError, ValidationError } from '@elmapicms/js-sdk'

type UploadedAsset = {
  uuid: string
  url?: string
  title?: string
  metadata?: { alt_text?: string | null, title?: string | null }
}

/**
 * BFF upload. POST /files ignores metadata, so alt_text/title are applied
 * afterward with bulkUpdateMetadata.
 */
export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Expected multipart form data.' })
  }

  const filePart = form.find(p => p.name === 'file')
  if (!filePart?.data?.length || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'file is required.' })
  }

  const altText = String(form.find(p => p.name === 'alt_text')?.data?.toString() ?? '').trim()
  const titleField = String(form.find(p => p.name === 'title')?.data?.toString() ?? '').trim()
  const title = titleField || filePart.filename

  try {
    const elmapi = useElmapiServer()
    const file = new File([filePart.data], filePart.filename, {
      type: filePart.type || 'application/octet-stream',
    })
    const asset = (await elmapi.assets.upload(file)) as UploadedAsset

    if (altText || title) {
      await elmapi.assets.bulkUpdateMetadata({
        items: [
          {
            uuid: asset.uuid,
            ...(altText ? { alt_text: altText } : {}),
            ...(title ? { title } : {}),
          },
        ],
      })
    }

    return {
      ok: true,
      uuid: asset.uuid,
      url: asset.url,
      title: title || asset.metadata?.title || asset.title,
      alt_text: altText || asset.metadata?.alt_text || null,
    }
  }
  catch (error) {
    if (error instanceof ValidationError) {
      throw createError({
        statusCode: 422,
        statusMessage: error.message || 'Validation failed.',
        data: error.details,
      })
    }
    if (error instanceof ElmapiError) {
      throw createError({
        statusCode: error.statusCode || 400,
        statusMessage: error.message || 'Upload failed.',
      })
    }
    throw error
  }
})
