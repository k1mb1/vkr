import type { components } from '#open-fetch-schemas/backend'
import type { SectionKey } from '~/composables/useTableSections'
import { applyBonus, applyPenalty, computeBonusCount, computePenaltyCount } from '~/composables/usePenalty'
import { groupBySection, scopeVisibleForSection } from '~/composables/useTableSections'

type GradingTableResponse = components['schemas']['GradingTableResponse']
type GradingTableLesson = components['schemas']['GradingTableLesson']
type AssignmentResponse = components['schemas']['AssignmentResponse']
type GradeCellResponse = components['schemas']['GradeCellResponse']
type Scope = components['schemas']['Scope']
type LessonType = NonNullable<GradingTableLesson['type']>
type LessonTypeFilter = 'ALL' | LessonType

const lessonTypeLabel: Record<LessonType, string> = {
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
  const { d } = useI18n()
  const toast = useToast()

  function formatLessonDate(lesson: GradingTableLesson): string {
    const date = lessonDate(lesson)
    if (!date)
      return '—'
    return d(new Date(date), 'numeric')
  }

  async function downloadExcel(
    data: GradingTableResponse | null | undefined,
    sectionsFilter?: string[],
    lessonType: LessonTypeFilter = 'ALL',
  ) {
    if (!data || !data.students?.length || !data.lessons?.length)
      return

    exportLoading.value = true
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      wb.Props = { Title: 'Оценки', Subject: 'Оценки' }

      const lessons = [...data.lessons]
        .filter(l => lessonType === 'ALL' || l.type === lessonType)
        .sort((a, b) => {
          const at = lessonDate(a) ? new Date(lessonDate(a)!).getTime() : Number.POSITIVE_INFINITY
          const bt = lessonDate(b) ? new Date(lessonDate(b)!).getTime() : Number.POSITIVE_INFINITY
          return at - bt || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
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

      const policy = data.penaltyPolicy

      const grouped = groupBySection(data.students)
      const visibleSections = sectionsFilter
        ? grouped.filter(g => sectionsFilter.includes(g.meta.key))
        : grouped

      // ── Сводный лист «Темы»: тип + тема (объединены) + группа + подгруппа + дата ──
      const groupNameMap = new Map<string, string>()
      const subgroupIndexMap = new Map<string, number>()
      for (const { meta } of grouped) {
        groupNameMap.set(meta.groupId, meta.groupName)
        if (meta.subgroupId != null && meta.subgroupIndex != null) {
          subgroupIndexMap.set(meta.subgroupId, meta.subgroupIndex)
        }
      }

      function scopeIsVisible(scope: Scope): boolean {
        if (scope.allGroups)
          return true
        for (const { meta } of visibleSections) {
          if (scopeVisibleForSection(scope, meta))
            return true
        }
        return false
      }

      const summaryRows: (string | number)[][] = []
      const summaryMerges: { s: { r: number, c: number }, e: { r: number, c: number } }[] = []
      let currentRow = 3

      for (const lesson of lessons) {
        const hasAllGroups = lesson.scopes?.some(s => (s as Scope).allGroups) ?? false

        if (hasAllGroups) {
          summaryRows.push([
            formatLessonType(lesson),
            lesson.topic ?? '—',
            'Все группы',
            '—',
            formatLessonDate(lesson),
          ])
          currentRow++
          continue
        }

        const visibleScopes = (lesson.scopes as Scope[] ?? []).filter(scopeIsVisible)
        if (!visibleScopes.length && !lesson.scopes?.length) {
          summaryRows.push([
            formatLessonType(lesson),
            lesson.topic ?? '—',
            '—',
            '—',
            '—',
          ])
          currentRow++
          continue
        }
        if (!visibleScopes.length)
          continue

        const startRow = currentRow
        for (const scope of visibleScopes) {
          const group = groupNameMap.get(scope.groupId!) ?? '—'
          const subgroup = scope.allowedSubgroupId == null
            ? 'Вся группа'
            : `Подгруппа ${subgroupIndexMap.get(scope.allowedSubgroupId) ?? '?'}`

          summaryRows.push([
            formatLessonType(lesson),
            lesson.topic ?? '—',
            group,
            subgroup,
            scope.startedAt ? d(new Date(scope.startedAt), 'numeric') : '—',
          ])
          currentRow++
        }
        if (visibleScopes.length > 1) {
          summaryMerges.push(
            { s: { r: startRow, c: 0 }, e: { r: startRow + visibleScopes.length - 1, c: 0 } },
            { s: { r: startRow, c: 1 }, e: { r: startRow + visibleScopes.length - 1, c: 1 } },
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
        const comments: { r: number, c: number, text: string }[] = []

        for (const student of sortedStudents) {
          const row: (string | number)[] = [student.username ?? '']
          for (const lesson of sectionLessons) {
            if (!lesson.id)
              continue
            const assignments = assignmentsByLesson.get(lesson.id) ?? []
            for (const a of assignments) {
              const g = gradeMap.get(`${student.id}:${a.id}`)
              let val: string | number = g?.score ?? ''
              if (g?.score != null && policy) {
                const penaltyCount = computePenaltyCount(policy, g.lessonsOffset)
                const bonusCount = computeBonusCount(policy, g.lessonsOffset)
                const afterPenalty = applyPenalty(g.score, penaltyCount, policy)
                const finalScore = applyBonus(afterPenalty, bonusCount, policy)
                if (finalScore !== g.score) {
                  val = Math.round(finalScore * 100) / 100
                  const parts: string[] = [`Исходный: ${g.score}`]
                  if (penaltyCount > 0)
                    parts.push(`Понижений: ${penaltyCount}`)
                  if (bonusCount > 0)
                    parts.push(`Бонусов: ${bonusCount}`)
                  comments.push({ r: 5 + rows.length, c: row.length, text: parts.join(' · ') })
                }
              }
              row.push(val)
            }
            const extra = gradeMap.get(`${student.id}:${lesson.id}:extra`)
            let extraVal: string | number = extra?.score ?? ''
            if (extra?.score != null && policy) {
              const penaltyCount = computePenaltyCount(policy, extra.lessonsOffset)
              const bonusCount = computeBonusCount(policy, extra.lessonsOffset)
              const afterPenalty = applyPenalty(extra.score, penaltyCount, policy)
              const finalScore = applyBonus(afterPenalty, bonusCount, policy)
              if (finalScore !== extra.score) {
                extraVal = Math.round(finalScore * 100) / 100
                const parts: string[] = [`Исходный: ${extra.score}`]
                if (penaltyCount > 0)
                  parts.push(`Понижений: ${penaltyCount}`)
                if (bonusCount > 0)
                  parts.push(`Бонусов: ${bonusCount}`)
                comments.push({ r: 5 + rows.length, c: row.length, text: parts.join(' · ') })
              }
            }
            row.push(extraVal)
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

        for (const { r, c, text } of comments) {
          const cellRef = XLSX.utils.encode_cell({ r, c })
          if (!ws[cellRef])
            ws[cellRef] = { t: 'n', v: '' }
          ws[cellRef].c = [{ a: 'Система', t: text }]
        }

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
