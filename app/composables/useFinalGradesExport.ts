export interface TypeBreakdown {
  required: number
  rawRequired: number
  optional: number
  rawOptional: number
  extra: number
  rawExtra: number
  attPresent: number
  attLate: number
  attAbsent: number
  attExcused: number
  /** Засчитанных посещений по выбранным статусам (для режима «отдельный порог»). */
  attCounted: number
  /** Всего отслеженных занятий этого типа (знаменатель процента). */
  attTracked: number
  attendance: number
  subtotal: number
  rawSubtotal: number
}

export interface StudentSummaryRow {
  id: string
  username: string
  lecture: TypeBreakdown
  practice: TypeBreakdown
  total: number
  rawTotal: number
  rank: number
  /** Число полностью закрытых обязательных задач (raw-балл ≥ макс). */
  closedRequired: number
  /** Всего обязательных задач (с ненулевым максимумом). */
  totalRequired: number
  /** Засчитанных посещений по выбранным статусам (для гейта SEPARATE). */
  attendanceCounted: number
  /** Всего отслеженных занятий студента (знаменатель процента). */
  attendanceTracked: number
  /** Ярлык вердикта промежуточной аттестации (если включена). */
  verdict?: string
}

export interface TypeMaxes {
  maxRequired: number
  maxOptional: number
  maxAttendance: number
  maxSubtotal: number
  lessonCount: number
}

export interface SummarySection {
  key: string
  label: string
  rows: StudentSummaryRow[]
  lecture: TypeMaxes
  practice: TypeMaxes
  maxPossibleTotal: number
  avgTotal: number
  maxTotal: number
  minTotal: number
  /** Идут ли баллы за посещаемость в итог (режим «включена в балл»). */
  hasAttendance: boolean
  /** Как показывать колонку посещаемости: баллы, процент, количество или скрыть. */
  attendanceDisplay: 'points' | 'percent' | 'count' | 'none'
  /** Порог процента посещений (режим «отдельное требование» + PERCENT). */
  attendanceMinPercent?: number | null
  /** Порог количества посещений (режим «отдельное требование» + COUNT). */
  attendanceMinCount?: number | null
}

interface LeafDesc {
  label: string
  sub: string
  get: (b: TypeBreakdown) => number
  rawGet?: (b: TypeBreakdown) => number
}

export function useFinalGradesExport() {
  const exportLoading = ref(false)

  function leafDescriptors(m: TypeMaxes, section: SummarySection): LeafDesc[] {
    const cols: LeafDesc[] = [
      { label: 'Обяз.', sub: m.maxRequired > 0 ? `до ${m.maxRequired}` : '', get: b => b.required, rawGet: b => b.rawRequired },
      { label: 'Необяз.', sub: m.maxOptional > 0 ? `до ${m.maxOptional}` : '', get: b => b.optional, rawGet: b => b.rawOptional },
      { label: 'Доп.', sub: '', get: b => b.extra, rawGet: b => b.rawExtra },
      { label: 'П', sub: '', get: b => b.attPresent },
      { label: 'О', sub: '', get: b => b.attLate },
      { label: 'Н', sub: '', get: b => b.attAbsent },
      { label: 'У', sub: '', get: b => b.attExcused },
    ]
    if (section.attendanceDisplay === 'points')
      cols.push({ label: 'Посещ.', sub: m.maxAttendance > 0 ? `до ${m.maxAttendance}` : '', get: b => b.attendance })
    else if (section.attendanceDisplay === 'count')
      cols.push({ label: 'Посещ.', sub: section.attendanceMinCount != null ? `мин ${section.attendanceMinCount}` : `до ${m.lessonCount}`, get: b => b.attCounted })
    else if (section.attendanceDisplay === 'percent')
      cols.push({ label: 'Посещ. %', sub: section.attendanceMinPercent != null ? `мин ${section.attendanceMinPercent}%` : '', get: b => (b.attTracked > 0 ? Math.round((b.attCounted / b.attTracked) * 10000) / 100 : 0) })
    cols.push({ label: 'Подитог', sub: m.maxSubtotal > 0 ? `до ${m.maxSubtotal}` : '', get: b => b.subtotal })
    return cols
  }

  async function downloadExcel(sections: SummarySection[]) {
    if (!sections.length)
      return

    exportLoading.value = true
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      wb.Props = { Title: 'Итоговые оценки', Subject: 'Итоговые оценки' }

      for (const section of sections) {
        const lecCols = leafDescriptors(section.lecture, section)
        const praCols = leafDescriptors(section.practice, section)
        const hasVerdict = section.rows.some(r => r.verdict != null)

        // Row 0: title · 1: blank · 2: group row · 3: header · 4: subheader · 5+: data
        const HEADER_ROWS = 5
        const pad = (n: number): string[] => Array.from<string>({ length: n }).fill('')
        const groupRow: string[] = ['']
        groupRow.push('Лекции', ...pad(lecCols.length - 1))
        groupRow.push('Практики', ...pad(praCols.length - 1))
        groupRow.push('Итого')
        if (hasVerdict)
          groupRow.push('Вердикт')

        const headerRow: string[] = ['Студент', ...lecCols.map(c => c.label), ...praCols.map(c => c.label), 'Итого']
        if (hasVerdict)
          headerRow.push('Вердикт')

        const subRow: string[] = [
          '',
          ...lecCols.map(c => c.sub),
          ...praCols.map(c => c.sub),
          section.maxPossibleTotal > 0 ? `до ${section.maxPossibleTotal}` : '',
        ]
        if (hasVerdict)
          subRow.push('')

        const rows: (string | number)[][] = []
        const comments: { r: number, c: number, text: string }[] = []

        for (const student of section.rows) {
          const row: (string | number)[] = [student.username]
          const pushGroup = (b: TypeBreakdown, cols: LeafDesc[]) => {
            for (const c of cols) {
              const val = c.get(b)
              row.push(val)
              if (c.rawGet) {
                const raw = c.rawGet(b)
                if (val !== raw)
                  comments.push({ r: HEADER_ROWS + rows.length, c: row.length - 1, text: `Исходный: ${raw}` })
              }
            }
          }
          pushGroup(student.lecture, lecCols)
          pushGroup(student.practice, praCols)
          row.push(student.total)
          if (hasVerdict)
            row.push(student.verdict ?? '')
          rows.push(row)
        }

        const wsData: (string | number)[][] = [
          [section.label],
          [],
          groupRow,
          headerRow,
          subRow,
          ...rows,
        ]

        const ws = XLSX.utils.aoa_to_sheet(wsData)

        for (const { r, c, text } of comments) {
          const cellRef = XLSX.utils.encode_cell({ r, c })
          if (!ws[cellRef])
            ws[cellRef] = { t: 'n', v: '' }
          ws[cellRef].c = [{ a: 'Система', t: text }]
        }

        const lecStart = 1
        const lecEnd = lecStart + lecCols.length - 1
        const praStart = lecEnd + 1
        const praEnd = praStart + praCols.length - 1
        const lastCol = praEnd + 1
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
          { s: { r: 2, c: lecStart }, e: { r: 2, c: lecEnd } },
          { s: { r: 2, c: praStart }, e: { r: 2, c: praEnd } },
        ]

        const colWidths = [{ wch: 32 }]
        for (let i = 1; i <= lastCol; i++)
          colWidths.push({ wch: 9 })
        ws['!cols'] = colWidths

        const rowHeights = [{ hpt: 20 }, { hpt: 8 }, { hpt: 18 }, { hpt: 16 }, { hpt: 14 }]
        for (let i = 0; i < rows.length; i++)
          rowHeights.push({ hpt: 18 })
        ws['!rows'] = rowHeights

        XLSX.utils.book_append_sheet(wb, ws, section.label.substring(0, 31))
      }

      if (wb.SheetNames.length === 0)
        return

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Итоговые_оценки_${new Date().toISOString().slice(0, 10)}.xlsx`
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
