import type { MaybeRefOrGetter } from 'vue'
import { getResults } from '#hey-api'
import { useFinalTable } from '~/composables/useFinalTable'
import { round2 } from '~/utils/number'

/**
 * Строка датасета `students` — то, над чем считают формулы декларативных
 * таблиц и что получают компоненты код-плагинов. Плоская и стабильная: это
 * публичный контракт для авторов плагинов, внутренние структуры наружу не идут.
 */
export interface StudentDatasetRow {
  id: string
  name: string
  /** Группа (и подгруппа), как в разделах таблиц. */
  group: string
  /** Место по итоговому баллу внутри группы. */
  rank: number
  /** Итоговый балл с учётом штрафов/бонусов и посещаемости. */
  total: number
  /** Балл без штрафов и бонусов. */
  rawTotal: number
  /** Максимально возможный балл в группе. */
  maxTotal: number
  /** total / maxTotal × 100. */
  percent: number
  lectureTotal: number
  practiceTotal: number
  requiredClosed: number
  requiredTotal: number
  present: number
  late: number
  absent: number
  excused: number
  /** Занятий с отметкой посещаемости. */
  tracked: number
  /** (present + late) / tracked × 100; 100, если отметок ещё нет. */
  attendancePercent: number
  /** Вердикт промежуточной аттестации, если она включена. */
  verdict: string | null
}

export function usePluginDataset(subjectId: MaybeRefOrGetter<string>) {
  const { permissionId, pending: permissionPending, error: permissionError } = usePermissions(subjectId)

  const { data: results, pending, error, refresh } = useApi(
    {
      key: computed(() => `plugin-dataset:${toValue(subjectId)}:${permissionId.value}`),
      immediate: false,
      watch: [permissionId],
    },
    () => getResults({ query: { permissionId: permissionId.value } }),
  )

  useRefreshOnPermission(permissionId, () => refresh())

  const grading = computed(() => results.value?.grading ?? null)
  const attendance = computed(() => results.value?.attendance ?? null)
  const { sections } = useFinalTable(grading, attendance)

  const rows = computed<StudentDatasetRow[]>(() =>
    sections.value.flatMap(section => section.rows.map((r) => {
      const present = r.lecture.attPresent + r.practice.attPresent
      const late = r.lecture.attLate + r.practice.attLate
      const absent = r.lecture.attAbsent + r.practice.attAbsent
      const excused = r.lecture.attExcused + r.practice.attExcused
      const tracked = present + late + absent + excused
      return {
        id: r.id,
        name: r.username,
        group: section.label,
        rank: r.rank,
        total: r.total,
        rawTotal: r.rawTotal,
        maxTotal: section.maxPossibleTotal,
        percent: section.maxPossibleTotal > 0 ? round2((r.total / section.maxPossibleTotal) * 100) : 0,
        lectureTotal: r.lecture.subtotal,
        practiceTotal: r.practice.subtotal,
        requiredClosed: r.closedRequired,
        requiredTotal: r.totalRequired,
        present,
        late,
        absent,
        excused,
        tracked,
        attendancePercent: tracked > 0 ? round2(((present + late) / tracked) * 100) : 100,
        verdict: r.verdict ?? null,
      }
    })),
  )

  return {
    rows,
    pending: computed(() => permissionPending.value || pending.value),
    error: computed(() => permissionError.value ?? error.value),
    refresh,
  }
}
