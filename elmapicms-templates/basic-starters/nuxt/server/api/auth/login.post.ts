import { ElmapiError } from '@elmapicms/js-sdk'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string }>(event)
  const email = String(body?.email ?? '').trim()
  const password = String(body?.password ?? '')

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required.',
    })
  }

  const client = createAuthClient()

  try {
    const result = await client.signInWithPassword({ email, password })
    const me = (await client.me()) as Record<string, unknown>

    setAuthCookies(event, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresAt: result.expires_at,
    })

    return {
      ok: true,
      user: {
        id: String(me.uuid ?? me.id ?? email),
        email: String(me.email ?? email),
        name: (me.display_name as string | undefined) ?? undefined,
      },
    }
  }
  catch (error) {
    if (error instanceof ElmapiError) {
      throw createError({
        statusCode: error.statusCode || 401,
        statusMessage: error.message || 'Sign-in failed.',
      })
    }
    throw error
  }
})
