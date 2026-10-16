import type { H3Event } from 'h3'

const ACCESS = 'elmapi_access_token'
const REFRESH = 'elmapi_refresh_token'
const EXPIRES = 'elmapi_expires_at'

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

export function setAuthCookies(
  event: H3Event,
  tokens: { accessToken: string, refreshToken?: string, expiresAt?: string },
) {
  setCookie(event, ACCESS, tokens.accessToken, cookieOpts)
  if (tokens.refreshToken) {
    setCookie(event, REFRESH, tokens.refreshToken, cookieOpts)
  }
  if (tokens.expiresAt) {
    setCookie(event, EXPIRES, tokens.expiresAt, cookieOpts)
  }
}

export function clearAuthCookies(event: H3Event) {
  deleteCookie(event, ACCESS, { path: '/' })
  deleteCookie(event, REFRESH, { path: '/' })
  deleteCookie(event, EXPIRES, { path: '/' })
}

export function getAuthCookies(event: H3Event) {
  return {
    accessToken: getCookie(event, ACCESS),
    refreshToken: getCookie(event, REFRESH),
    expiresAt: getCookie(event, EXPIRES),
  }
}

/** Refresh rotated tokens when access token is expired. */
export async function ensureFreshSession(event: H3Event) {
  const cookies = getAuthCookies(event)
  if (!cookies.accessToken) return null

  const expired
    = cookies.expiresAt
      && Date.now() >= new Date(cookies.expiresAt).getTime()

  if (!expired) {
    return cookies
  }

  if (!cookies.refreshToken) {
    clearAuthCookies(event)
    return null
  }

  const client = createAuthClient({
    accessToken: cookies.accessToken,
    refreshToken: cookies.refreshToken,
  })

  try {
    const refreshed = await client.refreshSession()
    const next = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? cookies.refreshToken,
      expiresAt: refreshed.expires_at,
    }
    setAuthCookies(event, next)
    return next
  }
  catch {
    clearAuthCookies(event)
    return null
  }
}
