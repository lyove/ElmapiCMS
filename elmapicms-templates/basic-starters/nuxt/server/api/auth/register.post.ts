import { ElmapiError } from '@elmapicms/js-sdk'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: string
    password?: string
    display_name?: string
  }>(event)

  const email = String(body?.email ?? '').trim()
  const password = String(body?.password ?? '')
  const displayName = String(body?.display_name ?? '').trim()

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required.',
    })
  }

  const client = createAuthClient()

  try {
    const result = (await client.signUp({
      email,
      password,
      display_name: displayName || undefined,
    })) as Record<string, unknown>

    if (result.verification_required) {
      return {
        ok: true,
        verification_required: true,
        verification_token:
          typeof result.verification_token === 'string'
            ? result.verification_token
            : undefined,
        email,
      }
    }

    const accessToken
      = typeof result.access_token === 'string' ? result.access_token : undefined

    if (!accessToken) {
      return {
        ok: true,
        verification_required: false,
        needs_login: true,
        email,
      }
    }

    // Prefer session from signup tokens. Do not call password sign-in again.
    setAuthCookies(event, {
      accessToken,
      refreshToken:
        typeof result.refresh_token === 'string' ? result.refresh_token : undefined,
      expiresAt:
        typeof result.expires_at === 'string' ? result.expires_at : undefined,
    })

    let userId = email
    let name = displayName || undefined
    try {
      const me = (await client.me()) as Record<string, unknown>
      userId = String(me.uuid ?? me.id ?? email)
      name = (me.display_name as string | undefined) || displayName || undefined
    }
    catch {
      // Tokens are enough even if me() fails.
    }

    return {
      ok: true,
      verification_required: false,
      user: { id: userId, email, name },
    }
  }
  catch (error) {
    if (error instanceof ElmapiError) {
      throw createError({
        statusCode: error.statusCode || 400,
        statusMessage: error.message || 'Registration failed.',
      })
    }
    throw error
  }
})
