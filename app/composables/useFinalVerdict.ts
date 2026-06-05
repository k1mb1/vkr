import type { components } from '#open-fetch-schemas/backend'

type FinalAssessmentPolicyResponse = components['schemas']['FinalAssessmentPolicyResponse']

/** Совокупность статусов посещаемости студента (сумма по всем типам занятий). */
export interface AttCounts {
  present: number
  late: number
  absent: number
  excused: number
}

export interface VerdictInput {
  /** Итоговый балл студента. */
  total: number
  /** Число полностью закрытых обязательных задач. */
  closedRequired: number
  /** Статусы посещаемости студента. */
  attendance: AttCounts
}

export interface VerdictResult {
  /** Ярлык вердикта (ярлык банды либо «Не аттестован»). */
  label: string
  /** Индекс банды в policy.bands; null — банда не присвоена. */
  bandIndex: number | null
  /** Общее число банд (для расчёта тона). */
  bandCount: number
  /** Студент не прошёл отдельный гейт посещаемости. */
  attendanceFailed: boolean
}

export interface VerdictTone {
  /** Нативный цвет nuxt-ui для UBadge. */
  color: 'success' | 'warning' | 'error'
  icon: string
}

/** Проходит ли студент отдельный гейт посещаемости (режим SEPARATE). */
export function attendanceGatePasses(
  policy: FinalAssessmentPolicyResponse,
  att: AttCounts,
): boolean {
  if (policy.attendanceMode !== 'SEPARATE')
    return true

  let attended = 0
  if (policy.attendanceCountPresent)
    attended += att.present
  if (policy.attendanceCountLate)
    attended += att.late
  if (policy.attendanceCountAbsent)
    attended += att.absent
  if (policy.attendanceCountExcused)
    attended += att.excused

  if (policy.attendanceRequirementMode === 'COUNT')
    return attended >= (policy.attendanceMinCount ?? 0)

  // PERCENT — без данных о посещаемости гейт не валит студента.
  const total = att.present + att.late + att.absent + att.excused
  if (total === 0)
    return true
  const percent = (attended / total) * 100
  return percent >= (policy.attendanceMinPercent ?? 0)
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

  if (!attendanceGatePasses(policy, input.attendance))
    return { label: 'Не аттестован', bandIndex: null, bandCount, attendanceFailed: true }

  for (let i = 0; i < bands.length; i++) {
    const b = bands[i]!
    const okPoints = b.minPoints == null || input.total >= b.minPoints
    const okTasks = b.requiredTasks == null || input.closedRequired >= b.requiredTasks
    if (okPoints && okTasks)
      return { label: b.label || '—', bandIndex: i, bandCount, attendanceFailed: false }
  }

  return { label: 'Не аттестован', bandIndex: null, bandCount, attendanceFailed: false }
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
