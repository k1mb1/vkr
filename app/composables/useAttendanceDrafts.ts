import type { BulkUpsertAttendanceRequest } from '#hey-api'
import { upsertAll } from '#hey-api'

type UpsertAttendanceRequest = BulkUpsertAttendanceRequest['items'][number]
type AttendanceStatus = UpsertAttendanceRequest['status']

/**
 * Черновики посещаемости: накопление правок по ячейкам, представление для
 * таблицы и массовое сохранение через `PUT /api/attendances`. Используется и на
 * странице занятия, и в сводной таблице посещаемости.
 */
export function useAttendanceDrafts(options: { onSaved?: () => Promise<void> | void } = {}) {
  const { toastError, toast } = useApiError()

  const changes = reactive<Record<string, AttendanceStatus>>({})
  const saving = ref(false)
  const dirty = computed(() => Object.keys(changes).length)

  /** Снимок изменений — то, что нужно таблице для подсветки черновиков. */
  const pendingView = computed<Record<string, AttendanceStatus>>(() => ({ ...changes }))

  function cellKey(payload: Pick<UpsertAttendanceRequest, 'studentId' | 'lessonScopeId'>): string {
    return `${payload.studentId}|${payload.lessonScopeId}`
  }

  function onChange(payload: UpsertAttendanceRequest) {
    changes[cellKey(payload)] = payload.status
  }

  function reset() {
    for (const k of Object.keys(changes))
      delete changes[k]
  }

  async function save() {
    if (dirty.value === 0 || saving.value)
      return
    const items: UpsertAttendanceRequest[] = Object.entries(changes).map(([key, status]) => {
      const [studentId, lessonScopeId] = key.split('|')
      return { studentId: studentId!, lessonScopeId: lessonScopeId!, status }
    })
    saving.value = true
    const { error } = await $api(() => upsertAll({ body: { items } }))
    saving.value = false

    if (error) {
      toastError(error, 'Не удалось сохранить')
      return
    }

    reset()
    await options.onSaved?.()
    toast.add({
      title: 'Посещаемость сохранена',
      description: `Обновлено ячеек: ${items.length}`,
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  }

  return { changes, saving, dirty, pendingView, onChange, reset, save }
}
