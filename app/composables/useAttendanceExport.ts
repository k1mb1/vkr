import type { components } from '#open-fetch-schemas/backend'
import { groupBySection, scopeVisibleForSection } from '~/composables/useTableSections'

type AttendanceTableResponse = components['schemas']['AttendanceTableResponse']
type AttendanceTableLesson = components['schemas']['AttendanceTableLesson']
type AttendanceCellResponse = components['schemas']['AttendanceCellResponse']
type AttendanceStatus = NonNullable<AttendanceCellResponse['status']>

const statusShort: Record<AttendanceStatus, string> = {
  PRESENT: 'П',
  ABSENT: 'Н',
  LATE: 'О',
  EXCUSED: 'У',
}

const lessonTypeLabel: Record<NonNullable<AttendanceTableLesson['type']>, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

export function useAttendanceExport() {
  const exportLoading = ref(false)
  const { d } = useI18n()

  function formatScopeDate(scope: AttendanceTableLesson): string {
    if (!scope.startedAt)
      return '—'
    return d(new Date(scope.startedAt), 'numeric')
  }

  function formatLessonType(scope: AttendanceTableLesson): string {
    const type = scope.type ? lessonTypeLabel[scope.type] : '—'
    return scope.orderIndex ? `${type} №${scope.orderIndex}` : type
  }

  async function downloadExcel(
    data: AttendanceTableResponse | null | undefined,
    sectionsFilter?: string[],
  ) {
    if (!data || !data.students?.length || !data.lessons?.length)
      return

    exportLoading.value = true
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      wb.Props = { Title: 'Посещаемость', Subject: 'Посещаемость' }

      const lessons = [...data.lessons].sort((a, b) => {
        const at = a.startedAt ? new Date(a.startedAt).getTime() : Number.POSITIVE_INFINITY
        const bt = b.startedAt ? new Date(b.startedAt).getTime() : Number.POSITIVE_INFINITY
        return at - bt || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      })

      const cellMap = new Map<string, AttendanceCellResponse>()
      for (const c of data.attendances ?? []) {
        if (c.studentId && c.lessonScopeId)
          cellMap.set(`${c.studentId}|${c.lessonScopeId}`, c)
      }

      const grouped = groupBySection(data.students)
      const visibleSections = sectionsFilter
        ? grouped.filter(g => sectionsFilter.includes(g.meta.key))
        : grouped

      for (const { meta, items } of visibleSections) {
        const sectionLessons = lessons.filter(sc => scopeVisibleForSection(sc, meta))
        if (!sectionLessons.length)
          continue

        const sortedStudents = items.sort((a, b) =>
          (a.username ?? '').localeCompare(b.username ?? '', 'ru'),
        )

        const rows: (string | number)[][] = []
        for (const student of sortedStudents) {
          const row: (string | number)[] = [student.username ?? '']
          for (const lesson of sectionLessons) {
            const cell = cellMap.get(`${student.id}|${lesson.id}`)
            row.push(cell?.status ? statusShort[cell.status] : '')
          }
          rows.push(row)
        }

        const headerRow = ['Студент', ...sectionLessons.map(l => formatLessonType(l))]
        const wsData: (string | number)[][] = [
          [meta.label],
          [],
          headerRow,
          ['', ...sectionLessons.map(l => formatScopeDate(l))],
          ['', ...sectionLessons.map(l => l.topic ?? '')],
          ...rows,
        ]

        const ws = XLSX.utils.aoa_to_sheet(wsData)

        const colWidths = [{ wch: 32 }]
        for (const _ of sectionLessons)
          colWidths.push({ wch: 14 })
        ws['!cols'] = colWidths

        const rowHeights = [{ hpt: 20 }, { hpt: 8 }, { hpt: 28 }, { hpt: 20 }, { hpt: 28 }]
        for (let i = 0; i < rows.length; i++)
          rowHeights.push({ hpt: 18 })
        ws['!rows'] = rowHeights

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
        ]

        XLSX.utils.book_append_sheet(wb, ws, meta.label.substring(0, 31))
      }

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Посещаемость_${new Date().toISOString().slice(0, 10)}.xlsx`
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
