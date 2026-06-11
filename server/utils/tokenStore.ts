import { randomUUID } from 'node:crypto'

/**
 * Серверное хранилище OIDC-токенов.
 *
 * Зачем: Casdoor выдаёт крупные JWT (access ~3.2k + refresh ~3.2k символов).
 * Если класть их в sealed-cookie сессии, зашифрованная cookie вылезает за лимит
 * браузера 4096 байт и молча отбрасывается — сессия не сохраняется. Поэтому сами
 * токены держим на сервере, а в cookie кладём только короткий `sid`.
 *
 * Драйвер: по умолчанию Nitro использует in-memory storage — токены живут, пока
 * жив процесс (на рестарте сервера потребуется повторный вход). Для прода/нескольких
 * инстансов настройте общий драйвер (Redis/FS) через `nitro.storage` в nuxt.config.
 */
export interface StoredTokens {
  accessToken: string
  refreshToken?: string
}

function store() {
  return useStorage<StoredTokens>('oidcTokens')
}

/** Создать новый id сессии. */
export function createSessionId(): string {
  return randomUUID()
}

export async function setTokens(sid: string, tokens: StoredTokens): Promise<void> {
  await store().setItem(sid, tokens)
}

export async function getTokens(sid: string): Promise<StoredTokens | null> {
  return (await store().getItem(sid)) ?? null
}

export async function deleteTokens(sid: string): Promise<void> {
  await store().removeItem(sid)
}
