import { AuthenticationError, ElmapiError } from '@elmapicms/js-sdk'

export default defineEventHandler(async (event) => {
  const session = await ensureFreshSession(event)
  if (!session?.accessToken) {
    return { authenticated: false, user: null }
  }

  try {
    const client = createAuthClient(session)
    const me = (await client.me()) as Record<string, unknown>
    return {
      authenticated: true,
      user: {
        id: String(me.uuid ?? me.id ?? ''),
        email: String(me.email ?? ''),
        name: (me.display_name as string | undefined) ?? undefined,
      },
    }
  }
  catch (error) {
    if (error instanceof AuthenticationError) {
      clearAuthCookies(event)
      return { authenticated: false, user: null }
    }
    if (error instanceof ElmapiError) {
      throw createError({
        statusCode: error.statusCode || 502,
        statusMessage: error.message || 'Failed to load user',
      })
    }
    throw error
  }
})
