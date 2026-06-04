import type { components } from '#open-fetch-schemas/backend'

type LessonResponse = components['schemas']['LessonResponse']
type LessonScopeResponse = components['schemas']['LessonScopeResponse']
export type LessonType = NonNullable<LessonResponse['type']>
export type LessonTypeFilter = 'ALL' | LessonType

const lessonTypeLabel: Record<LessonType, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

function formatLessonType(lesson: LessonResponse): string {
  const type = lesson.type ? lessonTypeLabel[lesson.type] : '—'
  return lesson.orderIndex ? `${type} №${lesson.orderIndex}` : type
}

function formatTopic(lesson: LessonResponse): string {
  return lesson.topic ?? '—'
}

function formatScopeInfo(scope: LessonScopeResponse): { group: string, subgroup: string, date: string } {
  if (scope.allGroups) {
    return {
      group: 'Все группы',
      subgroup: '—',
      date: scope.startedAt ?? '—',
    }
  }
  return {
    group: scope.groupName ?? '—',
    subgroup: scope.allowedSubgroupIndex ? `Подгруппа ${scope.allowedSubgroupIndex}` : 'Вся группа',
    date: scope.startedAt ?? '—',
  }
}

function formatDate(dateStr: string | undefined | null, d: (date: Date, format: string) => string): string {
  if (!dateStr || dateStr === '—')
    return '—'
  return d(new Date(dateStr), 'numeric')
}

export function useLessonsTopicsExport() {
  const exportLoading = ref(false)
  const { d } = useI18n()
  const toast = useToast()

  async function downloadExcel(
    data: LessonResponse[] | null | undefined,
    lessonType: LessonTypeFilter = 'ALL',
  ) {
    if (!data?.length)
      return

    const lessons = [...data]
      .filter(l => lessonType === 'ALL' || l.type === lessonType)
      .sort((a, b) => {
        const at = a.scopes?.[0]?.startedAt
          ? new Date(a.scopes[0].startedAt).getTime()
          : Number.POSITIVE_INFINITY
        const bt = b.scopes?.[0]?.startedAt
          ? new Date(b.scopes[0].startedAt).getTime()
          : Number.POSITIVE_INFINITY
        return at - bt || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      })

    if (!lessons.length) {
      toast.add({
        title: 'Нет данных для экспорта',
        description: 'Для выбранного типа занятий нет занятий.',
        color: 'warning',
        icon: 'i-lucide-info',
      })
      return
    }

    exportLoading.value = true
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      wb.Props = { Title: 'Темы занятий', Subject: 'Темы занятий' }

      const rows: (string | number)[][] = []
      const merges: { s: { r: number, c: number }, e: { r: number, c: number } }[] = []

      const header = ['Тип занятия', 'Тема', 'Группа', 'Подгруппа', 'Дата']
      rows.push(['Темы занятий'])
      rows.push([])
      rows.push(header)

      let currentRow = 3

      for (const lesson of lessons) {
        const topic = formatTopic(lesson)
        const scopes = lesson.scopes?.length
          ? lesson.scopes
          : [{ allGroups: true, groupName: undefined, allowedSubgroupIndex: undefined, startedAt: undefined } as unknown as LessonScopeResponse]

        const startRow = currentRow

        for (const scope of scopes) {
          const info = formatScopeInfo(scope)
          rows.push([
            formatLessonType(lesson),
            topic,
            info.group,
            info.subgroup,
            formatDate(info.date, d),
          ])
          currentRow++
        }

        // Объединяем ячейки "Тип занятия" и "Тема" если несколько проведений
        if (scopes.length > 1) {
          merges.push(
            { s: { r: startRow, c: 0 }, e: { r: startRow + scopes.length - 1, c: 0 } },
            { s: { r: startRow, c: 1 }, e: { r: startRow + scopes.length - 1, c: 1 } },
          )
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(rows)

      ws['!cols'] = [
        { wch: 18 },
        { wch: 50 },
        { wch: 22 },
        { wch: 16 },
        { wch: 14 },
      ]

      const rowHeights = [{ hpt: 20 }, { hpt: 8 }, { hpt: 28 }]
      for (let i = 0; i < currentRow - 3; i++)
        rowHeights.push({ hpt: 18 })
      ws['!rows'] = rowHeights

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } },
        ...merges,
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Темы занятий')

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Темы_занятий_${new Date().toISOString().slice(0, 10)}.xlsx`
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
