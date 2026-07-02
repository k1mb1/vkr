import type { AssignmentResponse, GradeCellResponse, GradingTableLesson } from '#hey-api'

/**
 * Общие хелперы для таблиц оценок и итогов: индексация заданий/оценок, ключи ячеек
 * и сортировка занятий. Раньше всё это дублировалось в каждом composable.
 */

/** Ключ ячейки оценки: `studentId:assignmentId` либо `studentId:lessonId:extra`. */
export function gradeCellKey(g: {
  studentId?: string | null
  assignmentId?: string | null
  lessonId?: string | null
}): string | null {
  if (!g.studentId || !g.lessonId)
    return null
  return g.assignmentId
    ? `${g.studentId}:${g.assignmentId}`
    : `${g.studentId}:${g.lessonId}:extra`
}

/** Задания, сгруппированные по занятию и отсортированные по `order`. */
export function indexAssignmentsByLesson(
  assignments: AssignmentResponse[] | undefined,
): Map<string, AssignmentResponse[]> {
  const map = new Map<string, AssignmentResponse[]>()
  for (const a of assignments ?? []) {
    if (!a.lessonId)
      continue
    const list = map.get(a.lessonId) ?? []
    list.push(a)
    map.set(a.lessonId, list)
  }
  for (const list of map.values())
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return map
}

/** Оценки, индексированные по ключу ячейки. */
export function indexGrades(
  grades: GradeCellResponse[] | undefined,
): Map<string, GradeCellResponse> {
  const map = new Map<string, GradeCellResponse>()
  for (const g of grades ?? []) {
    const key = gradeCellKey(g)
    if (key)
      map.set(key, g)
  }
  return map
}

/** Самая ранняя дата проведения занятия (по его scope'ам). */
export function gradingLessonDate(lesson: GradingTableLesson): string | undefined {
  const dates = (lesson.scopes ?? []).map(s => s.startedAt).filter((d): d is string => !!d)
  if (!dates.length)
    return undefined
  return dates.reduce((min, d) => (d < min ? d : min), dates[0]!)
}

/** Занятия по дате (раньше — выше), затем по `orderIndex`. */
export function sortGradingLessons(
  lessons: GradingTableLesson[] | undefined,
): GradingTableLesson[] {
  return [...(lessons ?? [])].sort((a, b) => {
    const at = gradingLessonDate(a) ? new Date(gradingLessonDate(a)!).getTime() : Number.POSITIVE_INFINITY
    const bt = gradingLessonDate(b) ? new Date(gradingLessonDate(b)!).getTime() : Number.POSITIVE_INFINITY
    return at - bt || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  })
}
