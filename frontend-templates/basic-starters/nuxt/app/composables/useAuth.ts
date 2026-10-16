type AuthUser = {
  id: string
  email: string
  name?: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loaded = useState('auth-loaded', () => false)

  async function refresh() {
    try {
      const data = await $fetch<{
        authenticated: boolean
        user: AuthUser | null
      }>('/api/auth/me')
      user.value = data.authenticated ? data.user : null
    }
    catch {
      user.value = null
    }
    finally {
      loaded.value = true
    }
  }

  async function login(email: string, password: string) {
    const data = await $fetch<{ ok: boolean, user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    user.value = data.user
    loaded.value = true
    return data
  }

  async function register(payload: {
    email: string
    password: string
    display_name?: string
  }) {
    const data = await $fetch<{
      ok: boolean
      verification_required?: boolean
      verification_token?: string
      needs_login?: boolean
      user?: AuthUser
      email?: string
    }>('/api/auth/register', {
      method: 'POST',
      body: payload,
    })
    if (data.user) {
      user.value = data.user
      loaded.value = true
    }
    return data
  }

  async function logout() {
    const data = await $fetch<{ ok?: boolean, revoked?: boolean }>('/api/auth/logout', {
      method: 'POST',
    })
    if (data.ok === false) {
      throw new Error('revoke_failed')
    }
    user.value = null
    return data
  }

  return {
    user,
    loaded,
    signedIn: computed(() => Boolean(user.value)),
    refresh,
    login,
    register,
    logout,
  }
}
