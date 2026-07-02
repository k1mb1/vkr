import type { FinalAssessmentPolicyResponse } from '#hey-api'

export interface VerdictInput {
  /** Итоговый балл студента. */
  total: number
  /** Максимально возможный балл (знаменатель для условия minPercent). */
  maxPoints?: number
  /** Число полностью закрытых обязательных задач. */
  closedRequired: number
  /** Всего обязательных задач (для уровней с пустым «мин. задач» — нужно закрыть все). */
  totalRequired?: number
  /** Засчитанных посещений по выбранным статусам (для гейта SEPARATE). */
  attendanceCounted?: number
  /** Всего отслеженных занятий студента (знаменатель процента). */
  attendanceTracked?: number
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
  /** true — студент не прошёл отдельный гейт посещаемости (attendanceMode === 'SEPARATE'). */
  attendanceGateFailed: boolean
}

export interface VerdictTone {
  /** Нативный цвет nuxt-ui для UBadge. */
  color: 'success' | 'warning' | 'error'
  icon: string
}

/**
 * Проверка отдельного гейта посещаемости (attendanceMode === 'SEPARATE').
 * Возвращает true, если гейт активен и НЕ пройден. Для COMBINED/без режима — всегда false.
 */
function attendanceGateFails(policy: FinalAssessmentPolicyResponse, input: VerdictInput): boolean {
  if (policy.attendanceMode !== 'SEPARATE')
    return false
  const counted = input.attendanceCounted ?? 0
  const tracked = input.attendanceTracked ?? 0
  if (policy.attendanceRequirementMode === 'COUNT')
    return policy.attendanceMinCount != null && counted < policy.attendanceMinCount
  if (policy.attendanceRequirementMode === 'PERCENT') {
    // Без отслеженных занятий процент не определён — гейт не валим.
    if (policy.attendanceMinPercent == null || tracked <= 0)
      return false
    return (counted / tracked) * 100 < policy.attendanceMinPercent
  }
  return false
}

/**
 * Вердикт для студента: первая (самая старшая) банда, чьи условия выполнены.
 * Условия банды (minPoints, minPercent, requiredTasks) комбинируются по AND;
 * пустое — без ограничения. minPercent — отдельный порог в процентах от
 * максимально возможного балла; вместе с minPoints он задаёт эффективный
 * минимум баллов (берётся наибольший из двух).
 * Поверх банд действует отдельный гейт посещаемости (SEPARATE): если он не пройден,
 * студент «Не аттестован» независимо от набранных баллов и закрытых задач.
 */
export function computeVerdict(
  policy: FinalAssessmentPolicyResponse,
  input: VerdictInput,
): VerdictResult {
  const bands = policy.bands ?? []
  const bandCount = bands.length
  const totalRequired = input.totalRequired ?? 0
  const maxPoints = input.maxPoints ?? 0
  const percent = maxPoints > 0 ? (input.total / maxPoints) * 100 : 0

  // Требование по задачам для уровня: пусто — закрыть ВСЕ обязательные задачи.
  const taskReqOf = (b: typeof bands[number]) => b.requiredTasks ?? totalRequired

  // Эффективный минимум баллов уровня: наибольший из minPoints и порога,
  // эквивалентного minPercent (minPercent% от максимально возможного балла).
  const minPointsOf = (b: typeof bands[number]): number => {
    const byPoints = b.minPoints ?? 0
    const byPercent = b.minPercent != null && maxPoints > 0 ? (b.minPercent / 100) * maxPoints : 0
    return Math.max(byPoints, byPercent)
  }

  // Считаем, сколько не хватает до ближайшей более старшей банды
  let pointsToNext: number | null = null
  let tasksToNext: number | null = null

  for (const b of bands) {
    const minPoints = minPointsOf(b)
    if (minPoints > 0 && input.total < minPoints) {
      const diff = minPoints - input.total
      if (pointsToNext == null || diff < pointsToNext)
        pointsToNext = diff
    }
    const req = taskReqOf(b)
    if (req > 0 && input.closedRequired < req) {
      const diff = req - input.closedRequired
      if (tasksToNext == null || diff < tasksToNext)
        tasksToNext = diff
    }
  }

  const attendanceGateFailed = attendanceGateFails(policy, input)
  if (attendanceGateFailed)
    return { label: 'Не аттестован', bandIndex: null, bandCount, pointsToNext, tasksToNext, attendanceGateFailed }

  for (let i = 0; i < bands.length; i++) {
    const b = bands[i]!
    const okPoints = b.minPoints == null || input.total >= b.minPoints
    const okPercent = b.minPercent == null || (maxPoints > 0 && percent >= b.minPercent)
    const okTasks = input.closedRequired >= taskReqOf(b)
    if (okPoints && okPercent && okTasks)
      return { label: b.label || '—', bandIndex: i, bandCount, pointsToNext, tasksToNext, attendanceGateFailed }
  }

  return { label: 'Не аттестован', bandIndex: null, bandCount, pointsToNext, tasksToNext, attendanceGateFailed }
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
