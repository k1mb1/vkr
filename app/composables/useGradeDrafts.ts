import type { components } from '#open-fetch-schemas/backend'

type BulkUpsertGradesRequest = components['schemas']['BulkUpsertGradesRequest']
type UpsertGradeRequest = BulkUpsertGradesRequest['items'][number]

interface PendingGrade {
  score: number
  comment?: string
}

interface GradeDraft extends PendingGrade {
  studentId: string
  lessonId: string
  assignmentId?: string
}

/**
 * Черновики оценок: накопление правок по ячейкам, представление для таблицы
 * и массовое сохранение через `PUT /api/grades`. Используется и на странице
 * занятия, и в сводном журнале оценок.
 */
export function useGradeDrafts(options: { onSaved?: () => Promise<void> | void } = {}) {
  const { $backend } = useNuxtApp()
  const { toastError, toast } = useApiError()

  const changes = reactive<Record<string, GradeDraft>>({})
  const saving = ref(false)
  const dirty = computed(() => Object.keys(changes).length)

  /** Снимок только score/comment — то, что нужно таблице для подсветки черновиков. */
  const pendingView = computed<Record<string, PendingGrade>>(() => {
    const out: Record<string, PendingGrade> = {}
    for (const [k, v] of Object.entries(changes))
      out[k] = { score: v.score, comment: v.comment }
    return out
  })

  function cellKey(payload: Pick<UpsertGradeRequest, 'studentId' | 'lessonId' | 'assignmentId'>): string {
    return payload.assignmentId
      ? `${payload.studentId}:${payload.assignmentId}`
      : `${payload.studentId}:${payload.lessonId}:extra`
  }

  function onChange(payload: UpsertGradeRequest) {
    changes[cellKey(payload)] = {
      studentId: payload.studentId,
      lessonId: payload.lessonId,
      assignmentId: payload.assignmentId,
      score: payload.score,
      comment: payload.comment,
    }
  }

  function reset() {
    for (const k of Object.keys(changes))
      delete changes[k]
  }

  async function save() {
    if (dirty.value === 0 || saving.value)
      return
    const items: UpsertGradeRequest[] = Object.values(changes).map(v => ({
      studentId: v.studentId,
      lessonId: v.lessonId,
      score: v.score,
      ...(v.assignmentId ? { assignmentId: v.assignmentId } : {}),
      ...(v.comment ? { comment: v.comment } : {}),
    }))
    saving.value = true
    try {
      const body: BulkUpsertGradesRequest = { items }
      await $backend('/api/grades', { method: 'PUT', body })
      reset()
      await options.onSaved?.()
      toast.add({
        title: 'Оценки сохранены',
        description: `Обновлено ячеек: ${items.length}`,
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    }
    catch (e) {
      toastError(e as Parameters<typeof toastError>[0], 'Не удалось сохранить')
    }
    finally {
      saving.value = false
    }
  }

  return { changes, saving, dirty, pendingView, onChange, reset, save }
}
