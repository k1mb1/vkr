import { DEMO_TEACHER, DEMO_TEACHER_ID } from '#server/utils/demoData'
import { isDemoModeEnabled } from '#server/utils/demoMode'

/**
 * Гостевой вход в демо-режиме — без OIDC. Ставит демо-сессию, чей `user.sub`
 * равен id демо-преподавателя, так что весь дашборд работает на сидовых данных
 * (см. server/utils/demoData.ts). Доступно только когда включён демо-режим.
 */
export default defineEventHandler(async (event) => {
  if (!isDemoModeEnabled(event))
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  await setUserSession(event, {
    user: {
      sub: DEMO_TEACHER_ID,
      name: DEMO_TEACHER.username,
      email: DEMO_TEACHER.email,
    },
    demo: true,
    // Помечаем синхронизацию сделанной, чтобы teacher-sync не ходил в бэкенд.
    teacherSyncedAt: Date.now(),
  })

  return { ok: true }
})
