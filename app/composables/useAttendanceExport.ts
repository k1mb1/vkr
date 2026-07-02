import type { AttendanceCellResponse, AttendanceTableLesson, AttendanceTableResponse } from '#hey-api'
import type { SectionKey } from '~/composables/useTableSections'
import { groupBySection, scopeVisibleForSection } from '~/composables/useTableSections'

type AttendanceStatus = NonNullable<AttendanceCellResponse['status']>
type LessonType = NonNullable<AttendanceTableLesson['type']>
type LessonTypeFilter = 'ALL' | LessonType

const statusShort: Record<AttendanceStatus, string> = {
  PRESENT: 'П',
  ABSENT: 'Н',
  LATE: 'О',
  EXCUSED: 'У',
}

const lessonTypeLabel: Record<LessonType, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

function subgroupLabel(section: SectionKey): string {
  return section.subgroupIndex ? `Подгруппа ${section.subgroupIndex}` : 'Вся группа'
}

export function useAttendanceExport() {
  const exportLoading = ref(false)
  const { d } = useI18n()
  const toast = useToast()

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
    lessonType: LessonTypeFilter = 'ALL',
  ) {
    if (!data || !data.students?.length || !data.lessons?.length)
      return

    exportLoading.value = true
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      wb.Props = { Title: 'Посещаемость', Subject: 'Посещаемость' }

      const lessons = [...data.lessons]
        .filter(l => lessonType === 'ALL' || l.type === lessonType)
        .sort((a, b) => {
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

      // ── Сводный лист «Темы»: тип + тема (объединены) + группа + подгруппа + дата ──
      const rawRows: { lessonId: string, row: (string | number)[] }[] = []
      for (const { meta } of visibleSections) {
        const sectionLessons = lessons.filter(sc => scopeVisibleForSection(sc, meta))
        for (const lesson of sectionLessons) {
          rawRows.push({
            lessonId: lesson.lessonId ?? lesson.id!,
            row: [
              formatLessonType(lesson),
              lesson.topic ?? '—',
              meta.groupName,
              subgroupLabel(meta),
              formatScopeDate(lesson),
            ],
          })
        }
      }

      const summaryRows: (string | number)[][] = []
      const summaryMerges: { s: { r: number, c: number }, e: { r: number, c: number } }[] = []
      let currentRow = 3

      const lessonOrder: string[] = []
      const rowsByLesson = new Map<string, (string | number)[][]>()
      for (const { lessonId, row } of rawRows) {
        if (!rowsByLesson.has(lessonId))
          lessonOrder.push(lessonId)
        const list = rowsByLesson.get(lessonId) ?? []
        list.push(row)
        rowsByLesson.set(lessonId, list)
      }

      for (const lessonId of lessonOrder) {
        const rows = rowsByLesson.get(lessonId)!
        const startRow = currentRow
        for (const row of rows) {
          summaryRows.push(row)
          currentRow++
        }
        if (rows.length > 1) {
          summaryMerges.push(
            { s: { r: startRow, c: 0 }, e: { r: startRow + rows.length - 1, c: 0 } },
            { s: { r: startRow, c: 1 }, e: { r: startRow + rows.length - 1, c: 1 } },
          )
        }
      }

      if (summaryRows.length) {
        const summaryHeader = ['Тип занятия', 'Тема', 'Группа', 'Подгруппа', 'Дата']
        const summaryData: (string | number)[][] = [
          ['Темы занятий'],
          [],
          summaryHeader,
          ...summaryRows,
        ]
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
        summaryWs['!cols'] = [{ wch: 18 }, { wch: 50 }, { wch: 22 }, { wch: 16 }, { wch: 14 }]
        summaryWs['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: summaryHeader.length - 1 } },
          ...summaryMerges,
        ]
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Темы')
      }

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

      if (wb.SheetNames.length === 0) {
        toast.add({
          title: 'Нет данных для экспорта',
          description: 'Для выбранных групп и типа занятий нет занятий.',
          color: 'warning',
          icon: 'i-lucide-info',
        })
        return
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
