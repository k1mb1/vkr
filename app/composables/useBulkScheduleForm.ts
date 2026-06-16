import type { components } from '#open-fetch-schemas/backend'

type LessonResponse = components['schemas']['LessonResponse']

export type DayOfWeek
  = | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY'

export interface BulkScheduleAudience {
  groupId: string
  allowedSubgroupId?: string | null
}

/**
 * Тело `POST /api/lessons/bulk-schedule`. Описано вручную: на момент написания
 * эндпоинт ещё не попал в OpenAPI-схему. Когда попадёт — заменить на
 * `components['schemas'][...]` и убрать локальные типы.
 */
export interface BulkScheduleRequest {
  subjectId: string
  lessonType: 'LECTURE' | 'PRACTICE'
  firstLessonDate: string
  count: number
  days: DayOfWeek[][]
  audience: BulkScheduleAudience | null
}

export type BulkScheduleResponse = LessonResponse

/** Дни недели в порядке пн→вс. Индекс в массиве = смещение от понедельника. */
export const WEEKDAYS: { value: DayOfWeek, short: string, label: string }[] = [
  { value: 'MONDAY', short: 'Пн', label: 'Понедельник' },
  { value: 'TUESDAY', short: 'Вт', label: 'Вторник' },
  { value: 'WEDNESDAY', short: 'Ср', label: 'Среда' },
  { value: 'THURSDAY', short: 'Чт', label: 'Четверг' },
  { value: 'FRIDAY', short: 'Пт', label: 'Пятница' },
  { value: 'SATURDAY', short: 'Сб', label: 'Суббота' },
  { value: 'SUNDAY', short: 'Вс', label: 'Воскресенье' },
]

const DAY_INDEX = new Map<DayOfWeek, number>(WEEKDAYS.map((d, i) => [d.value, i]))

/** Разбор `YYYY-MM-DD` в UTC-дату (без влияния часового пояса). */
function parseDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m)
    return null
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(date: Date): string {
  const y = date.getUTCFullYear()
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

/** Индекс дня недели, пн=0 … вс=6 (`null`, если дата не распознана). */
export function weekdayIndex(value: string): number | null {
  const date = parseDate(value)
  if (!date)
    return null
  return (date.getUTCDay() + 6) % 7
}

/**
 * Повторяет расчёт дат на бэке: понедельник недели первой пары, далее по неделям
 * `w` берём шаблон `days[w % days.length]`, внутри недели дни идут по возрастанию,
 * останавливаемся ровно на `count`.
 */
export function generateScheduleDates(
  firstLessonDate: string,
  count: number,
  days: DayOfWeek[][],
): string[] {
  const first = parseDate(firstLessonDate)
  if (!first || count <= 0 || days.length === 0)
    return []
  if (!days.some(week => week.length > 0))
    return []

  const monday = addDays(first, -((first.getUTCDay() + 6) % 7))
  const out: string[] = []
  const maxWeeks = count * days.length + days.length + 1 // защита от зацикливания

  for (let w = 0; out.length < count && w < maxWeeks; w++) {
    const template = days[w % days.length] ?? []
    const indices = template
      .map(d => DAY_INDEX.get(d) ?? 0)
      .sort((a, b) => a - b)
    for (const idx of indices) {
      if (out.length >= count)
        break
      out.push(formatDate(addDays(monday, w * 7 + idx)))
    }
  }

  return out
}

/**
 * Проверки, которые бэк не делает на стороне фронта. Первая неделя шаблона должна
 * быть непустой, а дата первой пары — приходиться на её самый ранний день, иначе
 * бэк ответит 400.
 */
export function validateSchedule(input: {
  firstLessonDate: string
  count: number
  days: DayOfWeek[][]
}): string[] {
  const errs: string[] = []
  const { firstLessonDate, count, days } = input

  if (!firstLessonDate)
    errs.push('Укажите дату первой пары')
  if (count <= 0)
    errs.push('Количество проведений должно быть больше 0')
  if (!days.some(week => week.length > 0))
    errs.push('Выберите хотя бы один день недели в шаблоне')

  const firstWeek = days[0] ?? []
  if (firstWeek.length === 0) {
    errs.push('В первой неделе шаблона выберите хотя бы один день')
  }
  else if (firstLessonDate) {
    const anchor = weekdayIndex(firstLessonDate)
    const earliest = Math.min(...firstWeek.map(d => DAY_INDEX.get(d) ?? 0))
    if (anchor != null && anchor !== earliest) {
      errs.push(
        `Дата первой пары должна приходиться на «${WEEKDAYS[earliest]?.label}» — самый ранний день первой недели`,
      )
    }
  }

  return errs
}
