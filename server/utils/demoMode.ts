import type { H3Event } from 'h3'

/** Включён ли демо-режим (флаг деплоя `NUXT_PUBLIC_DEMO_MODE=true`). */
export function isDemoModeEnabled(event: H3Event): boolean {
  return useRuntimeConfig(event).public.demoMode === true
}

/** У текущего запроса демо-сессия (гостевой вход через `/demo`). */
export async function isDemoSession(event: H3Event): Promise<boolean> {
  if (!isDemoModeEnabled(event))
    return false
  const session = await getUserSession(event)
  return (session as { demo?: boolean }).demo === true
}
