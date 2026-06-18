import type { components } from '#open-fetch-schemas/backend'

export type BulkScheduleAudience = components['schemas']['LessonScopeAudienceRequest']

export type GroupWithSubgroups = components['schemas']['GroupWithSubgroupsResponse']

/**
 * День недели. В api-docs перечисление дней больше не публикуется отдельной схемой
 * (раньше жило только в удалённом поле `days`), поэтому объявлено вручную.
 */
export type DayOfWeek
  = | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

/**
 * Один элемент расписания: аудитория со своим стартом и недельным шаблоном.
 * `audience === null` — занятие для всех групп предмета.
 */
export interface BulkScheduleItem {
  audience?: BulkScheduleAudience | null
  firstLessonDate: string
  days: DayOfWeek[][]
}

/**
 * Тело запроса bulk-schedule. Берём сгенерированную схему as-is и переопределяем
 * только `items`: в api-docs схема `Item` из-за коллизии имён описывает чужой DTO
 * (id/audience/startedAt), а реальный контракт элемента — это {@link BulkScheduleItem}.
 */
export type BulkScheduleRequest
  = Omit<components['schemas']['BulkScheduleLessonsRequest'], 'items'> & { items: BulkScheduleItem[] }

export type BulkScheduleResponse = components['schemas']['LessonResponse']

/**
 * Каст тела запроса к сгенерированному типу. Нужен потому, что схема `Item` в
 * api-docs из-за коллизии имён описывает чужой DTO; реальный контракт — см.
 * {@link BulkScheduleItem}.
 */
export function bulkScheduleBody(req: BulkScheduleRequest) {
  return req as unknown as components['schemas']['BulkScheduleLessonsRequest']
}

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

// ── Состояние формы (структура аудиторий — как в useLessonScopeForm) ─────────────

/** Расписание одной аудитории: дата первой пары + недельный шаблон. */
export interface ScheduleEntry {
  firstLessonDate: string
  /** Внешний массив — недели, внутренний (длина 7) — дни пн…вс. */
  weeks: boolean[][]
}

export interface SubgroupScheduleEntry {
  subgroupId: string
  index: number
  schedule: ScheduleEntry
}

export interface GroupScheduleEntry {
  groupId: string
  groupName: string
  subgroups: { id: string, index: number }[]
  /** если true — у каждой подгруппы своё расписание */
  splitBySubgroups: boolean
  /** расписание на всю группу (когда splitBySubgroups=false) */
  schedule: ScheduleEntry
  subgroupSchedules: SubgroupScheduleEntry[]
}

export type BulkScheduleMode = 'all' | 'groups'

export interface BulkScheduleFormState {
  mode: BulkScheduleMode
  allGroupsSchedule: ScheduleEntry
  groupEntries: GroupScheduleEntry[]
}

export function emptyWeek(): boolean[] {
  return Array.from<boolean>({ length: 7 }).fill(false)
}

export function emptySchedule(): ScheduleEntry {
  return { firstLessonDate: '', weeks: [emptyWeek()] }
}

export function initialBulkScheduleState(): BulkScheduleFormState {
  return { mode: 'all', allGroupsSchedule: emptySchedule(), groupEntries: [] }
}

export function initBulkScheduleGroups(state: BulkScheduleFormState, groups: GroupWithSubgroups[]) {
  state.groupEntries = groups.map(g => ({
    groupId: g.id!,
    groupName: g.name ?? g.id ?? '',
    subgroups: (g.subgroups ?? []).map(s => ({ id: s.id!, index: s.index ?? 0 })),
    splitBySubgroups: false,
    schedule: emptySchedule(),
    subgroupSchedules: (g.subgroups ?? []).map(s => ({
      subgroupId: s.id!,
      index: s.index ?? 0,
      schedule: emptySchedule(),
    })),
  }))
}

/** Недельный шаблон расписания в формате запроса (`days`). */
export function scheduleToDays(schedule: ScheduleEntry): DayOfWeek[][] {
  return schedule.weeks.map(week => WEEKDAYS.filter((_, i) => week[i]).map(d => d.value))
}

export function validateBulkSchedule(state: BulkScheduleFormState, count: number): string[] {
  const errs: string[] = []
  if (count <= 0)
    errs.push('Количество проведений должно быть больше 0')

  const check = (s: ScheduleEntry, label: string) => {
    errs.push(...validateSchedule({
      firstLessonDate: s.firstLessonDate,
      count,
      days: scheduleToDays(s),
      label,
      checkCount: false,
    }))
  }

  if (state.mode === 'all') {
    check(state.allGroupsSchedule, '')
    return errs
  }

  if (!state.groupEntries.length)
    errs.push('К предмету не привязаны группы')

  for (const entry of state.groupEntries) {
    if (!entry.splitBySubgroups) {
      check(entry.schedule, `Группа «${entry.groupName}»`)
    }
    else {
      for (const sub of entry.subgroupSchedules)
        check(sub.schedule, `${entry.groupName}, подгруппа ${sub.index}`)
    }
  }

  return errs
}

/** Сбор `items[]` запроса из состояния формы (структура — как buildLessonScopeRequests). */
export function buildBulkScheduleItems(state: BulkScheduleFormState): BulkScheduleItem[] {
  const item = (audience: BulkScheduleAudience | null, s: ScheduleEntry): BulkScheduleItem => ({
    audience,
    firstLessonDate: s.firstLessonDate,
    days: scheduleToDays(s),
  })

  if (state.mode === 'all')
    return [item(null, state.allGroupsSchedule)]

  const out: BulkScheduleItem[] = []
  for (const entry of state.groupEntries) {
    if (!entry.splitBySubgroups) {
      out.push(item({ groupId: entry.groupId }, entry.schedule))
    }
    else {
      for (const sub of entry.subgroupSchedules)
        out.push(item({ groupId: entry.groupId, allowedSubgroupId: sub.subgroupId }, sub.schedule))
    }
  }
  return out
}

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
  /** Префикс для сообщений (имя аудитории), чтобы различать ошибки разных расписаний. */
  label?: string
  /** Проверять `count` (для общего на всю форму счётчика — отключают). */
  checkCount?: boolean
}): string[] {
  const errs: string[] = []
  const { firstLessonDate, count, days, label, checkCount = true } = input

  if (!firstLessonDate)
    errs.push('Укажите дату первой пары')
  if (checkCount && count <= 0)
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

  return label ? errs.map(e => `${label}: ${e}`) : errs
}
