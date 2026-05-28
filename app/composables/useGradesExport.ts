import type { components } from '#open-fetch-schemas/backend'
import type { SectionKey } from '~/composables/useTableSections'
import { groupBySection } from '~/composables/useTableSections'

type GradingTableResponse = components['schemas']['GradingTableResponse']
type GradingTableLesson = components['schemas']['GradingTableLesson']
type AssignmentResponse = components['schemas']['AssignmentResponse']
type GradeCellResponse = components['schemas']['GradeCellResponse']
type Scope = components['schemas']['Scope']

const lessonTypeLabel: Record<NonNullable<GradingTableLesson['type']>, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

function lessonDate(l: GradingTableLesson): string | undefined {
  const dates = (l.scopes ?? [])
    .map(s => (s as Scope).startedAt)
    .filter((d): d is string => !!d)
  if (!dates.length)
    return undefined
  return dates.reduce((min, d) => (d < min ? d : min), dates[0]!)
}

function formatLessonDate(lesson: GradingTableLesson): string {
  const d = lessonDate(lesson)
  if (!d)
    return '—'
  return new Intl.DateTimeFormat('ru', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

function formatLessonType(lesson: GradingTableLesson): string {
  const type = lesson.type ? lessonTypeLabel[lesson.type] : '—'
  return lesson.orderIndex ? `${type} №${lesson.orderIndex}` : type
}

function lessonVisibleForSection(lesson: GradingTableLesson, section: SectionKey): boolean {
  if (!lesson.scopes || lesson.scopes.length === 0)
    return true
  for (const scope of lesson.scopes) {
    const s = scope as Scope
    if (s.allGroups)
      return true
    if (!section.groupId || !s.groupId)
      continue
    if (s.groupId !== section.groupId)
      continue
    if (s.allowedSubgroupId == null)
      return true
    if (s.allowedSubgroupId === section.subgroupId)
      return true
  }
  return false
}

export function useGradesExport() {
  const exportLoading = ref(false)

  async function downloadExcel(
    data: GradingTableResponse | null | undefined,
    sectionsFilter?: string[],
  ) {
    if (!data || !data.students?.length || !data.lessons?.length)
      return

    exportLoading.value = true
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      wb.Props = { Title: 'Оценки', Subject: 'Оценки' }

      const lessons = [...data.lessons].sort((a, b) => {
        const at = lessonDate(a) ? new Date(lessonDate(a)!).getTime() : 0
        const bt = lessonDate(b) ? new Date(lessonDate(b)!).getTime() : 0
        return at - bt
      })

      const assignmentsByLesson = new Map<string, AssignmentResponse[]>()
      for (const a of data.assignments ?? []) {
        if (!a.lessonId)
          continue
        const list = assignmentsByLesson.get(a.lessonId) ?? []
        list.push(a)
        assignmentsByLesson.set(a.lessonId, list)
      }
      for (const list of assignmentsByLesson.values())
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

      const gradeMap = new Map<string, GradeCellResponse>()
      for (const g of data.grades ?? []) {
        if (!g.studentId || !g.lessonId)
          continue
        const key = g.assignmentId
          ? `${g.studentId}:${g.assignmentId}`
          : `${g.studentId}:${g.lessonId}:extra`
        gradeMap.set(key, g)
      }

      const grouped = groupBySection(data.students)
      const visibleSections = sectionsFilter
        ? grouped.filter(g => sectionsFilter.includes(g.meta.key))
        : grouped

      for (const { meta, items } of visibleSections) {
        const sectionLessons = lessons.filter(l => lessonVisibleForSection(l, meta))
        if (!sectionLessons.length)
          continue

        const sortedStudents = items.sort((a, b) =>
          (a.username ?? '').localeCompare(b.username ?? '', 'ru'),
        )

        // Build headers row by row
        const lessonHeaderRow: string[] = ['']
        const assignmentHeaderRow: string[] = ['Студент']
        const pointsHeaderRow: string[] = ['']
        const merges: { s: { r: number, c: number }, e: { r: number, c: number } }[] = []

        for (const lesson of sectionLessons) {
          if (!lesson.id)
            continue
          const assignments = assignmentsByLesson.get(lesson.id) ?? []
          const lessonColCount = assignments.length + 1 // + extra

          const startCol = lessonHeaderRow.length
          const lessonInfo = `${formatLessonType(lesson)}\n${formatLessonDate(lesson)}${lesson.topic ? `\n${lesson.topic}` : ''}`
          lessonHeaderRow.push(lessonInfo)
          for (let i = 1; i < lessonColCount; i++)
            lessonHeaderRow.push('')

          merges.push({
            s: { r: 2, c: startCol },
            e: { r: 2, c: startCol + lessonColCount - 1 },
          })

          for (const a of assignments) {
            assignmentHeaderRow.push(`№${a.order ?? '-'}`)
            pointsHeaderRow.push(`${a.maxPoints ?? '-'} б${a.required ? ' req' : ''}`)
          }
          assignmentHeaderRow.push('+')
          pointsHeaderRow.push('extra')
        }

        const rows: (string | number)[][] = []
        for (const student of sortedStudents) {
          const row: (string | number)[] = [student.username ?? '']
          for (const lesson of sectionLessons) {
            if (!lesson.id)
              continue
            const assignments = assignmentsByLesson.get(lesson.id) ?? []
            for (const a of assignments) {
              const g = gradeMap.get(`${student.id}:${a.id}`)
              row.push(g?.score ?? '')
            }
            const extra = gradeMap.get(`${student.id}:${lesson.id}:extra`)
            row.push(extra?.score ?? '')
          }
          rows.push(row)
        }

        const wsData: (string | number)[][] = [
          [meta.label],
          [],
          lessonHeaderRow,
          assignmentHeaderRow,
          pointsHeaderRow,
          ...rows,
        ]

        const ws = XLSX.utils.aoa_to_sheet(wsData)

        const colWidths = [{ wch: 32 }]
        for (let i = 1; i < assignmentHeaderRow.length; i++)
          colWidths.push({ wch: 10 })
        ws['!cols'] = colWidths

        const rowHeights = [{ hpt: 20 }, { hpt: 8 }, { hpt: 40 }, { hpt: 18 }, { hpt: 16 }]
        for (let i = 0; i < rows.length; i++)
          rowHeights.push({ hpt: 18 })
        ws['!rows'] = rowHeights

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: assignmentHeaderRow.length - 1 } },
          ...merges,
        ]

        XLSX.utils.book_append_sheet(wb, ws, meta.label.substring(0, 31))
      }

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Оценки_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    finally {
      exportLoading.value = false
    }
  }

  return { exportLoading, downloadExcel }
}
