import { AuthenticationError } from '@elmapicms/js-sdk'

/**
 * Revoke the Elmapi backend session before clearing cookies.
 * Cookie-clear-only logout is not complete logout.
 */
export default defineEventHandler(async (event) => {
  const cookies = getAuthCookies(event)

  if (!cookies.accessToken) {
    clearAuthCookies(event)
    return { ok: true, revoked: false }
  }

  const client = createAuthClient({
    accessToken: cookies.accessToken,
    refreshToken: cookies.refreshToken,
  })

  try {
    await client.signOut()
    clearAuthCookies(event)
    return { ok: true, revoked: true }
  }
  catch (error) {
    if (error instanceof AuthenticationError) {
      clearAuthCookies(event)
      return { ok: true, revoked: false, reason: 'already_invalid' }
    }
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not revoke the backend session.',
      data: { ok: false, revoked: false, reason: 'revoke_failed' },
    })
  }
})
