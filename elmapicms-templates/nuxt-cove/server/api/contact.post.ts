export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    email?: string
    company?: string
    message?: string
  }>(event)

  const name = body.name?.trim()
  const email = body.email?.trim()
  const message = body.message?.trim()
  const company = body.company?.trim()

  if (!name || !email || !message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name, email, and message are required'
    })
  }

  await useElmapiServer().content.create('contact-submissions', {
    data: {
      name,
      email,
      company: company || '',
      message
    },
    state: 'draft'
  })

  return { ok: true }
})
