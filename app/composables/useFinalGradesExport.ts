export interface StudentSummaryRow {
  id: string
  username: string
  required: number
  rawRequired: number
  optional: number
  rawOptional: number
  extra: number
  rawExtra: number
  attendance: number
  attPresent: number
  attLate: number
  attAbsent: number
  attExcused: number
  total: number
  rawTotal: number
  rank: number
}

export interface SummarySection {
  key: string
  label: string
  rows: StudentSummaryRow[]
  maxRequired: number
  avgTotal: number
  maxTotal: number
  minTotal: number
  hasAttendance: boolean
}

export function useFinalGradesExport() {
  const exportLoading = ref(false)

  async function downloadExcel(sections: SummarySection[]) {
    if (!sections.length)
      return

    exportLoading.value = true
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      wb.Props = { Title: 'Итоговые оценки', Subject: 'Итоговые оценки' }

      for (const section of sections) {
        const headers: string[] = ['Студент']
        const subHeaders: (string | number)[] = ['']

        headers.push('Обяз.')
        subHeaders.push(section.maxRequired > 0 ? `до ${section.maxRequired}` : '')

        headers.push('Необяз.', 'Доп.')
        subHeaders.push('', '')

        headers.push('П', 'О', 'Н', 'У')
        subHeaders.push('', '', '', '')

        if (section.hasAttendance) {
          headers.push('Балл')
          subHeaders.push('')
        }

        headers.push('Итого')
        subHeaders.push('')

        const rows: (string | number)[][] = []
        const comments: { r: number, c: number, text: string }[] = []

        for (const student of section.rows) {
          const row: (string | number)[] = [student.username]

          const pushVal = (adjusted: number, raw: number) => {
            const rounded = Math.round(adjusted * 10) / 10
            if (adjusted !== raw) {
              row.push(rounded)
              comments.push({
                r: 4 + rows.length,
                c: row.length - 1,
                text: `Исходный: ${raw}`,
              })
            }
            else {
              row.push(rounded)
            }
          }

          pushVal(student.required, student.rawRequired)
          pushVal(student.optional, student.rawOptional)
          pushVal(student.extra, student.rawExtra)

          row.push(student.attPresent, student.attLate, student.attAbsent, student.attExcused)

          if (section.hasAttendance)
            row.push(student.attendance)

          row.push(student.total)
          rows.push(row)
        }

        const wsData: (string | number)[][] = [
          [section.label],
          [],
          headers,
          subHeaders,
          ...rows,
        ]

        const ws = XLSX.utils.aoa_to_sheet(wsData)

        for (const { r, c, text } of comments) {
          const cellRef = XLSX.utils.encode_cell({ r, c })
          if (!ws[cellRef])
            ws[cellRef] = { t: 'n', v: '' }
          ws[cellRef].c = [{ a: 'Система', t: text }]
        }

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        ]

        const colWidths = [{ wch: 32 }]
        for (let i = 1; i < headers.length; i++)
          colWidths.push({ wch: 10 })
        ws['!cols'] = colWidths

        const rowHeights = [{ hpt: 20 }, { hpt: 8 }, { hpt: 18 }, { hpt: 16 }]
        for (let i = 0; i < rows.length; i++)
          rowHeights.push({ hpt: 18 })
        ws['!rows'] = rowHeights

        XLSX.utils.book_append_sheet(wb, ws, section.label.substring(0, 31))
      }

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
