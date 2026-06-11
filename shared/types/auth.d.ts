declare module '#auth-utils' {
  interface User {
    sub?: string
    email?: string
    name?: string
  }

  interface UserSession {
    loggedInAt?: number
    tokenExpiresAt?: number
    teacherSyncedAt?: number
  }

  interface SecureSessionData {
    // Идентификатор записи в серверном хранилище токенов (server/utils/tokenStore).
    // Сами access/refresh токены в cookie не хранятся — иначе sealed-cookie
    // превышает лимит браузера 4096 байт и отбрасывается.
    sid?: string
  }
}

export {}
