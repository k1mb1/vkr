import type { User } from '#auth-utils'

/**
 * teacherId текущего преподавателя из OIDC-сессии (`user.sub`).
 *
 * Реактивный computed, а не одноразовый destructure (`const { sub } = user.value`):
 * во время SSR / до гидрации сессии `sub` может быть null/undefined, и
 * «замороженное» пустое значение потом улетало бы в required-uuid query
 * (500 "Expected string but received null"). Пустая строка — сигнал «id ещё
 * нет»: по ней на месте вызова гейтится запрос (`teacherId.value ? ... : ...`).
 */
export function useTeacherId() {
  const { user } = useOidcAuth()

  return computed(() => (user.value as User | null)?.sub ?? '')
}
