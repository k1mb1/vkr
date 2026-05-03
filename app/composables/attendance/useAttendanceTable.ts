import type { PresenceType, SubjectAttendanceResponse } from '#shared/types/backend'
import type { BadgeProps } from '@nuxt/ui'
import { PRESENCE_TYPES } from '#shared/types/backend'
import { computed, ref } from 'vue'
import { upsertLessonAttendance } from '~/composables/api/useAttendanceApi'
import { useApiError } from '~/composables/useApiError'

export interface AttendanceRow {
  studentId: string
  username: string
  [lessonId: string]: string | number
}

export interface LessonSummary {
  present: number
  late: number
  notPresent: number
  none: number
}

export interface AttendanceStats {
  studentCount: number
  lessonCount: number
  attended: number
  total: number
  pct: number | null
  color: BadgeProps['color']
}

export const PRESENCE_META: Record<
  PresenceType,
  { icon: string, label: string, color: BadgeProps['color'] }
> = {
  NONE: { icon: 'i-lucide-minus', label: 'Не отмечено', color: 'neutral' },
  PRESENT: { icon: 'i-lucide-check', label: 'Присутствовал', color: 'success' },
  LATE: { icon: 'i-lucide-clock', label: 'Опоздание', color: 'warning' },
  NOT_PRESENT: { icon: 'i-lucide-x', label: 'Отсутствовал', color: 'error' },
}

export function useAttendanceTable(
  props: { data: SubjectAttendanceResponse | null, activeType?: string },
  emit: (event: 'refresh') => void,
) {
  const { toastError } = useApiError()
  const searchQuery = ref('')

  const filteredLessons = computed(() => {
    const d = props.data
    if (!d)
      return []
    if (props.activeType === 'ALL')
      return d.lessons
    return d.lessons.filter(l => l.type === props.activeType)
  })

  const rows = computed<AttendanceRow[]>(() => {
    const d = props.data
    if (!d)
      return []

    let students = d.students
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      students = students.filter(s => s.username.toLowerCase().includes(q))
    }

    return students.map((student) => {
      const row: AttendanceRow = {
        studentId: student.id,
        username: student.username,
      }
      for (const lesson of filteredLessons.value) {
        const att = d.attendances.find(
          a => a.studentId === student.id && a.lessonId === lesson.lessonId,
        )
        row[lesson.lessonId] = att?.presence ?? 'NONE'
      }
      return row
    })
  })

  const stats = computed<AttendanceStats | null>(() => {
    const lessons = filteredLessons.value
    const students = rows.value
    if (lessons.length === 0 || students.length === 0)
      return null

    let present = 0
    let late = 0
    const total = lessons.length * students.length

    for (const student of students) {
      for (const lesson of lessons) {
        const p = (student[lesson.lessonId] as PresenceType) ?? 'NONE'
        if (p === 'PRESENT')
          present++
        else if (p === 'LATE')
          late++
      }
    }

    const attended = present + late
    const pct = total > 0 ? Math.round((attended / total) * 100) : null
    const color = pct === null ? 'neutral' : pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'error'

    return { studentCount: students.length, lessonCount: lessons.length, attended, total, pct, color }
  })

  const lessonSummaries = computed<Record<string, LessonSummary>>(() => {
    const d = props.data
    const result: Record<string, LessonSummary> = {}
    if (!d)
      return result

    for (const lesson of filteredLessons.value) {
      const summary: LessonSummary = { present: 0, late: 0, notPresent: 0, none: 0 }
      for (const student of d.students) {
        const att = d.attendances.find(
          a => a.studentId === student.id && a.lessonId === lesson.lessonId,
        )
        const presence = att?.presence ?? 'NONE'
        switch (presence) {
          case 'PRESENT': {
            summary.present++
            break
          }
          case 'LATE': {
            summary.late++
            break
          }
          case 'NOT_PRESENT': {
            summary.notPresent++
            break
          }
          default: {
            summary.none++
            break
          }
        }
      }
      result[lesson.lessonId] = summary
    }
    return result
  })

  function getLessonSummary(lessonId: string): LessonSummary {
    return lessonSummaries.value[lessonId] ?? { present: 0, late: 0, notPresent: 0, none: 0 }
  }

  const upsertPending = ref<Set<string>>(new Set())

  async function onSetAttendance(lessonId: string, studentId: string, presence: PresenceType) {
    const key = `${lessonId}:${studentId}`
    if (upsertPending.value.has(key))
      return
    upsertPending.value.add(key)
    const { error } = await upsertLessonAttendance(lessonId, {
      studentId,
      presence,
      note: null,
    })
    upsertPending.value.delete(key)
    if (error.value) {
      toastError(error.value, 'Не удалось обновить посещаемость')
    }
    else {
      emit('refresh')
    }
  }

  return {
    searchQuery,
    filteredLessons,
    rows,
    stats,
    lessonSummaries,
    getLessonSummary,
    upsertPending,
    onSetAttendance,
    PRESENCE_TYPES,
    PRESENCE_META,
  }
}
