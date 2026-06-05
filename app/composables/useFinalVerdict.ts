import type { components } from '#open-fetch-schemas/backend'

type FinalAssessmentPolicyResponse = components['schemas']['FinalAssessmentPolicyResponse']

export interface VerdictInput {
  /** Итоговый балл студента. */
  total: number
  /** Число полностью закрытых обязательных задач. */
  closedRequired: number
}

export interface VerdictResult {
  /** Ярлык вердикта (ярлык банды либо «Не аттестован»). */
  label: string
  /** Индекс банды в policy.bands; null — банда не присвоена. */
  bandIndex: number | null
  /** Общее число банд (для расчёта тона). */
  bandCount: number
  /** Сколько баллов не хватает до ближайшей более старшей банды (null — нет ограничения по баллам). */
  pointsToNext: number | null
  /** Сколько обязательных задач не хватает до ближайшей более старшей банды (null — нет ограничения по задачам). */
  tasksToNext: number | null
}

export interface VerdictTone {
  /** Нативный цвет nuxt-ui для UBadge. */
  color: 'success' | 'warning' | 'error'
  icon: string
}

/**
 * Вердикт для студента: первая (самая старшая) банда, чьи условия выполнены.
 * Условия банды (minPoints, requiredTasks) комбинируются по AND; пустое — без ограничения.
 */
export function computeVerdict(
  policy: FinalAssessmentPolicyResponse,
  input: VerdictInput,
): VerdictResult {
  const bands = policy.bands ?? []
  const bandCount = bands.length

  // Считаем, сколько не хватает до ближайшей более старшей банды
  let pointsToNext: number | null = null
  let tasksToNext: number | null = null

  for (const b of bands) {
    if (b.minPoints != null && input.total < b.minPoints) {
      const diff = b.minPoints - input.total
      if (pointsToNext == null || diff < pointsToNext)
        pointsToNext = diff
    }
    if (b.requiredTasks != null && input.closedRequired < b.requiredTasks) {
      const diff = b.requiredTasks - input.closedRequired
      if (tasksToNext == null || diff < tasksToNext)
        tasksToNext = diff
    }
  }

  for (let i = 0; i < bands.length; i++) {
    const b = bands[i]!
    const okPoints = b.minPoints == null || input.total >= b.minPoints
    const okTasks = b.requiredTasks == null || input.closedRequired >= b.requiredTasks
    if (okPoints && okTasks)
      return { label: b.label || '—', bandIndex: i, bandCount, pointsToNext, tasksToNext }
  }

  return { label: 'Не аттестован', bandIndex: null, bandCount, pointsToNext, tasksToNext }
}

/** Цветовой тон вердикта: верхние банды — зелёные, ниже — жёлтые, без банды — красный. */
export function verdictTone(result: VerdictResult): VerdictTone {
  if (result.bandIndex == null)
    return { color: 'error', icon: 'i-lucide-circle-x' }

  const frac = result.bandCount > 1 ? result.bandIndex / (result.bandCount - 1) : 0
  if (frac <= 0.5)
    return { color: 'success', icon: 'i-lucide-circle-check' }
  return { color: 'warning', icon: 'i-lucide-circle-alert' }
}
