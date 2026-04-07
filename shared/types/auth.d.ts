declare module '#auth-utils' {
  interface User {
    sub?: string
    email?: string
    name?: string
    groups?: string[]
  }

  interface UserSession {
    loggedInAt?: number
    tokenExpiresAt?: number
  }

  interface SecureSessionData {
    accessToken?: string
    refreshToken?: string
  }
}

export {}
