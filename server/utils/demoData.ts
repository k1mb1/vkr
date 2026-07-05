/**
 * Демо-данные для витрины приложения (демо-режим для комиссии).
 *
 * Активны только когда включён демо-режим (`NUXT_PUBLIC_DEMO_MODE=true`) и у
 * запроса демо-сессия. В этом случае прокси НЕ ходит в реальный бэкенд, а
 * отдаёт сидовый набор отсюда. Данные только для чтения: любые
 * POST/PUT/PATCH/DELETE возвращают 403 с понятным сообщением.
 *
 * Набор самодостаточный — бэкенд поднимать не нужно, демку можно задеплоить
 * куда угодно и открыть по QR (ссылка ведёт на `/demo`).
 *
 * Предметы демонстрируют разные сценарии:
 *  - «Программирование» — режим COMBINED, штрафы за просрочку и бонусы за раннюю
 *    сдачу, одна группа;
 *  - «Базы данных» — режим SEPARATE (порог посещаемости даёт «Не аттестован»
 *    из-за пропусков), одна группа;
 *  - «Операционные системы» — несколько групп, лекции общие, практики разбиты по
 *    подгруппам (у каждой (группа, подгруппа) — своя колонка проведения).
 *
 * ТИПИЗАЦИЯ: билдеры и фикстуры типизированы сгенерированными типами ответов из
 * `#hey-api`. При изменении схемы API (`pnpm gen:api`) несоответствия здесь
 * подсветит `pnpm typecheck`. Генератор помечает поля опциональными и не
 * допускает `null`, поэтому «пустые» поля опускаются, а не выставляются в null.
 */
import type {
  AssignmentResponse,
  AttendanceTableResponse,
  CheckInPolicyResponse,
  CheckInPreviewResponse,
  CheckInSessionResponse,
  FinalAssessmentPolicyResponse,
  GradingTableResponse,
  GroupPageResponse,
  GroupResponse,
  GroupWithSubgroupsResponse,
  LessonResponse,
  PageMetadata,
  StudentAttendanceResponse,
  StudentResponse,
  SubgroupResponse,
  SubjectPageResponse,
  TeacherResponse,
  TeacherSubjectPermissionResponse,
} from '#hey-api'

/** Детерминированный валидный UUID (v4-подобный) из числового seed. */
function uid(seed: number): string {
  const hex = seed.toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

const CREATED = '2026-01-15T09:00:00Z'

/** Демо-преподаватель. `user.sub` демо-сессии равен этому id. */
export const DEMO_TEACHER_ID = uid(1)
export const DEMO_TEACHER = {
  id: DEMO_TEACHER_ID,
  username: 'Демо преподаватель',
  email: 'demo@example.com',
  createdAt: CREATED,
  updatedAt: CREATED,
} satisfies TeacherResponse

// --- Идентификаторы --------------------------------------------------------
const SUBJ1 = uid(10)
const SUBJ2 = uid(11)
const SUBJ3 = uid(12)
const PERM1 = uid(20)
const PERM2 = uid(21)
const PERM3 = uid(22)
const G1 = uid(30)
const G2 = uid(31)
const G3 = uid(32)
const G4 = uid(33)

// --- Группы, подгруппы, студенты ------------------------------------------
interface DemoSubgroup { id: string, index: number, createdAt: string, updatedAt: string }
interface Student {
  id: string
  username: string
  groupId: string
  groupName: string
  subgroupId: string
  subgroupIndex: number
}
interface DemoGroup {
  id: string
  name: string
  subgroups: DemoSubgroup[]
  students: Student[]
}

function subgroup(id: string, index: number): DemoSubgroup {
  return { id, index, createdAt: CREATED, updatedAt: CREATED }
}

/** Собирает группу: имена по подгруппам (массив имён на каждую подгруппу). */
function makeGroup(id: string, name: string, base: number, bySubgroup: Array<{ sgId: string, index: number, names: string[] }>): DemoGroup {
  const subgroups = bySubgroup.map(s => subgroup(s.sgId, s.index))
  const students: Student[] = []
  let n = base
  for (const s of bySubgroup) {
    for (const username of s.names) {
      students.push({ id: uid(n++), username, groupId: id, groupName: name, subgroupId: s.sgId, subgroupIndex: s.index })
    }
  }
  return { id, name, subgroups, students }
}

const GROUP1 = makeGroup(G1, 'ИС-401', 100, [
  { sgId: uid(40), index: 1, names: ['Анна Ковалёва', 'Борис Мельник', 'Виктор Седов'] },
  { sgId: uid(41), index: 2, names: ['Галина Орлова', 'Дмитрий Львов', 'Елена Титова'] },
])
const GROUP2 = makeGroup(G2, 'ИС-402', 110, [
  { sgId: uid(42), index: 1, names: ['Жанна Белова', 'Игорь Морозов', 'Кира Волкова', 'Лев Гущин'] },
])
const GROUP3 = makeGroup(G3, 'ИС-501', 120, [
  { sgId: uid(43), index: 1, names: ['Пётр Зайцев', 'Ольга Рыжова'] },
  { sgId: uid(44), index: 2, names: ['Роман Дьяков', 'София Панова'] },
])
const GROUP4 = makeGroup(G4, 'ИС-502', 124, [
  { sgId: uid(45), index: 1, names: ['Тимур Носов', 'Ульяна Гай'] },
  { sgId: uid(46), index: 2, names: ['Фёдор Ким', 'Юлия Спивак'] },
])

const ALL_GROUPS: DemoGroup[] = [GROUP1, GROUP2, GROUP3, GROUP4]

// --- Занятия / статусы ------------------------------------------------------
type LessonType = 'LECTURE' | 'PRACTICE'
const LECTURE: LessonType = 'LECTURE'
const PRACTICE: LessonType = 'PRACTICE'

const ATT_LETTER = { P: 'PRESENT', L: 'LATE', A: 'ABSENT', E: 'EXCUSED' } as const
type AttLetter = keyof typeof ATT_LETTER

// Семестр начинается в феврале 2026 (понедельник 2 февраля).
function lessonDate(weekOffset: number, extraDays = 0): string {
  const base = new Date('2026-02-02T00:00:00Z')
  base.setUTCDate(base.getUTCDate() + weekOffset * 7 + extraDays)
  return base.toISOString().slice(0, 10)
}

interface StudentProfile {
  /** Баллы за обязательные задания в порядке практик. */
  req: number[]
  /** Балл за необязательное задание (у кого оно есть). */
  opt: number
  /** Статусы посещения по занятиям (в порядке). */
  att: AttLetter[]
  /** Смещение сдачи по обязательным заданиям: >0 просрочка (штраф), <0 досрочно (бонус). */
  off?: number[]
}

// --- Политики (общие наглядные значения) ----------------------------------
const penaltyPolicy = {
  enabled: true,
  operation: 'SUBTRACT',
  step: 1,
  gracePeriodLessons: 1,
  intervalLessons: 1,
  maxReductions: 3,
  bonusEnabled: true,
  bonusOperation: 'ADD',
  bonusStep: 1,
  bonusGracePeriodLessons: 1,
  bonusIntervalLessons: 1,
  bonusMaxIncreases: 3,
} satisfies GradingTableResponse['penaltyPolicy']

const attendancePolicy = {
  enabled: true,
  pointsPresent: 1,
  pointsLate: 0.5,
  pointsAbsent: 0,
  pointsExcused: 0.5,
} satisfies GradingTableResponse['attendancePolicy']

const gradingHighlightPolicy = {
  enabled: true,
  assignmentColor: '#3b82f6',
  fullColor: '#22c55e',
  partialLowColor: '#f97316',
  partialHighColor: '#eab308',
} satisfies GradingTableResponse['highlightPolicy']

const attendanceHighlightPolicy = {
  enabled: true,
  presentColor: '#22c55e',
  lateColor: '#eab308',
  absentColor: '#ef4444',
  excusedColor: '#3b82f6',
} satisfies AttendanceTableResponse['highlightPolicy']

const checkInPolicy = {
  enabled: true,
  onTimeSeconds: 300,
  lateSeconds: 600,
} satisfies CheckInPolicyResponse

const finalBandIds = [uid(600), uid(601), uid(602)]

interface BandDef { label: string, minPoints: number, minPercent: number, requiredTasks: number }

// --- Определения предметов --------------------------------------------------
interface SubjectDef {
  id: string
  name: string
  description: string
  permId: string
  groups: DemoGroup[]
  /** Практики разбиваются по подгруппам (у каждой (группа, подгруппа) своя колонка). */
  practiceSplit: boolean
  /** Второе (необязательное) задание на первой практике. */
  optionalOnFirstPractice: boolean
  /** У обязательного задания последней практики — допуск по уровням (TIERED). */
  tieredLastPractice?: boolean
  finalMode: 'COMBINED' | 'SEPARATE'
  finalAttendanceMinPercent: number
  /** Банды аттестации от старшего к младшему. */
  finalBands: BandDef[]
  topics: Array<[LessonType, string]>
  lessonBase: number
  assignmentBase: number
  profiles: StudentProfile[]
  /** Комментарии к ячейкам посещаемости, ключ `studentIndex:lessonIndex`. */
  attComments?: Record<string, string>
  /** Комментарии к ячейкам оценок по обязательным заданиям, ключ `studentIndex:rank`. */
  gradeComments?: Record<string, string>
}

const SUBJECT_DEFS: SubjectDef[] = [
  {
    id: SUBJ1,
    name: 'Программирование',
    description: 'Основы программирования, 3 семестр',
    permId: PERM1,
    groups: [GROUP1],
    practiceSplit: false,
    optionalOnFirstPractice: true,
    tieredLastPractice: true,
    finalMode: 'COMBINED',
    finalAttendanceMinPercent: 60,
    finalBands: [
      { label: 'Отлично', minPoints: 34, minPercent: 80, requiredTasks: 3 },
      { label: 'Хорошо', minPoints: 26, minPercent: 60, requiredTasks: 2 },
      { label: 'Удовлетворительно', minPoints: 18, minPercent: 40, requiredTasks: 1 },
    ],
    // Комментарии к ячейкам (демонстрация фичи комментариев).
    attComments: { '3:2': 'По болезни', '1:5': 'Уехал на олимпиаду' },
    gradeComments: { '1:1': 'Сдано с опозданием на 3 занятия', '4:0': 'Сдано досрочно' },
    topics: [
      [LECTURE, 'Введение. Модель памяти'],
      [PRACTICE, 'Переменные и типы'],
      [LECTURE, 'Управляющие конструкции'],
      [PRACTICE, 'Циклы и массивы'],
      [LECTURE, 'Функции и области видимости'],
      [PRACTICE, 'Рекурсия'],
    ],
    lessonBase: 200,
    assignmentBase: 400,
    // Борис — штраф за просрочку, Дмитрий — бонус за раннюю сдачу.
    profiles: [
      { req: [10, 10, 10], opt: 5, att: ['P', 'P', 'P', 'P', 'P', 'L'] },
      { req: [10, 10, 8], opt: 3, att: ['P', 'P', 'P', 'P', 'L', 'A'], off: [0, 3, 0] },
      { req: [10, 7, 6], opt: 2, att: ['P', 'P', 'P', 'L', 'A', 'E'] },
      { req: [6, 5, 7], opt: 0, att: ['P', 'L', 'A', 'A', 'A', 'A'] },
      { req: [10, 10, 9], opt: 4, att: ['P', 'P', 'P', 'P', 'L', 'L'], off: [-3, 0, 0] },
      { req: [10, 10, 10], opt: 4, att: ['P', 'P', 'P', 'P', 'P', 'P'] },
    ],
  },
  {
    id: SUBJ2,
    name: 'Базы данных',
    description: 'Реляционные БД и SQL',
    permId: PERM2,
    groups: [GROUP2],
    practiceSplit: false,
    optionalOnFirstPractice: true,
    finalMode: 'SEPARATE',
    finalAttendanceMinPercent: 60,
    finalBands: [
      { label: 'Отлично', minPoints: 13, minPercent: 80, requiredTasks: 1 },
      { label: 'Хорошо', minPoints: 10, minPercent: 60, requiredTasks: 1 },
      { label: 'Удовлетворительно', minPoints: 6, minPercent: 40, requiredTasks: 1 },
    ],
    topics: [
      [LECTURE, 'Реляционная модель'],
      [PRACTICE, 'SQL: выборки'],
      [LECTURE, 'Нормализация'],
    ],
    lessonBase: 220,
    assignmentBase: 420,
    // Игорь — баллы отличные, но пропуски → «Не аттестован» из-за посещаемости.
    profiles: [
      { req: [10], opt: 5, att: ['P', 'P', 'P'] },
      { req: [10], opt: 3, att: ['A', 'A', 'P'] },
      { req: [10], opt: 0, att: ['P', 'L', 'P'] },
      { req: [10], opt: 5, att: ['P', 'P', 'L'] },
    ],
  },
  {
    id: SUBJ3,
    name: 'Операционные системы',
    description: 'Две группы, практики разбиты по подгруппам',
    permId: PERM3,
    groups: [GROUP3, GROUP4],
    practiceSplit: true,
    optionalOnFirstPractice: false,
    finalMode: 'COMBINED',
    finalAttendanceMinPercent: 60,
    finalBands: [
      { label: 'Отлично', minPoints: 20, minPercent: 80, requiredTasks: 2 },
      { label: 'Хорошо', minPoints: 15, minPercent: 60, requiredTasks: 1 },
      { label: 'Удовлетворительно', minPoints: 10, minPercent: 40, requiredTasks: 1 },
    ],
    topics: [
      [LECTURE, 'Процессы и потоки'],
      [PRACTICE, 'Планировщик'],
      [LECTURE, 'Синхронизация'],
      [PRACTICE, 'Управление памятью'],
    ],
    lessonBase: 240,
    assignmentBase: 440,
    // G3(sg1: Пётр, Ольга; sg2: Роман, София), G4(sg1: Тимур, Ульяна; sg2: Фёдор, Юлия)
    profiles: [
      { req: [10, 10], opt: 0, att: ['P', 'P', 'P', 'P'] },
      { req: [10, 8], opt: 0, att: ['P', 'L', 'P', 'P'] },
      { req: [10, 10], opt: 0, att: ['P', 'P', 'L', 'P'] },
      { req: [10, 7], opt: 0, att: ['P', 'P', 'P', 'A'] },
      { req: [10, 10], opt: 0, att: ['P', 'P', 'P', 'P'] },
      { req: [10, 9], opt: 0, att: ['L', 'P', 'P', 'P'] },
      { req: [8, 10], opt: 0, att: ['A', 'P', 'P', 'P'] },
      { req: [10, 10], opt: 0, att: ['P', 'P', 'P', 'P'] },
    ],
  },
]

// --- Внутренние сущности ----------------------------------------------------
interface Lesson {
  id: string
  subjectId: string
  subjectName: string
  type: LessonType
  orderIndex: number
  topic: string
  active: boolean
  startedAt: string
}

// Проведение занятия (колонка): лекции — общая (allGroups), практики — на группу
// или на (группу, подгруппу) при разбиении. Знает своих студентов.
interface Scope {
  id: string
  lessonId: string
  lessonIndex: number
  type: LessonType
  orderIndex: number
  topic: string
  active: boolean
  startedAt: string
  groupId: string
  groupName: string
  allowedSubgroupId?: string
  allowedSubgroupIndex?: number
  allGroups: boolean
  studentIds: string[]
}

interface ComputedSubject {
  def: SubjectDef
  students: Student[]
  lessons: Lesson[]
  assignments: AssignmentResponse[]
  scopes: Scope[]
  profileById: Map<string, StudentProfile>
}

let scopeSeed = 3000

function buildSubject(def: SubjectDef): ComputedSubject {
  const students = def.groups.flatMap(g => g.students)

  const lessons: Lesson[] = def.topics.map(([type, topic], i) => ({
    id: uid(def.lessonBase + i),
    subjectId: def.id,
    subjectName: def.name,
    type,
    orderIndex: i + 1,
    topic,
    active: false,
    startedAt: lessonDate(i),
  }))

  // Активно только последнее занятие каждого типа (точка отсчёта штрафа);
  // не более одного активного на (предмет, тип).
  const lastOfType = new Map<LessonType, Lesson>()
  for (const l of lessons)
    lastOfType.set(l.type, l)
  for (const l of lastOfType.values())
    l.active = true

  const practiceLessons = lessons.filter(l => l.type === PRACTICE)
  const assignments: AssignmentResponse[] = []
  let an = def.assignmentBase
  practiceLessons.forEach((l, practiceIdx) => {
    const isLast = practiceIdx === practiceLessons.length - 1
    // На последней практике — допуск по уровням (TIERED): порог балла на каждый
    // уровень аттестации. Иначе — простой минимальный балл.
    const tiered = def.tieredLastPractice && isLast
    assignments.push({
      id: uid(an++),
      lessonId: l.id,
      order: 1,
      maxPoints: 10,
      required: true,
      ...(tiered
        ? {
            admissionMode: 'TIERED',
            admissionTiers: [
              { bandId: finalBandIds[2], minScore: 4 },
              { bandId: finalBandIds[1], minScore: 7 },
              { bandId: finalBandIds[0], minScore: 9 },
            ],
          }
        : { admissionMode: 'MIN_SCORE', admissionMinScore: 4, admissionTiers: [] }),
    })
    if (def.optionalOnFirstPractice && practiceIdx === 0)
      assignments.push({ id: uid(an++), lessonId: l.id, order: 2, maxPoints: 5, required: false, admissionMode: 'NONE', admissionTiers: [] })
  })

  const scopes: Scope[] = []
  const base = (l: Lesson, li: number) => ({ lessonId: l.id, lessonIndex: li, type: l.type, orderIndex: l.orderIndex, topic: l.topic, active: l.active })
  lessons.forEach((l, li) => {
    if (l.type === LECTURE) {
      const g0 = def.groups[0]!
      scopes.push({ id: uid(scopeSeed++), ...base(l, li), startedAt: l.startedAt, groupId: g0.id, groupName: g0.name, allGroups: true, studentIds: students.map(s => s.id) })
      return
    }
    // Разбитые практики каждой (группа, подгруппа) проводятся в свою дату:
    // считаем от даты занятия по дню на каждую подгруппу.
    let splitDay = 0
    for (const g of def.groups) {
      if (def.practiceSplit) {
        for (const sg of g.subgroups) {
          scopes.push({
            id: uid(scopeSeed++),
            ...base(l, li),
            startedAt: lessonDate(li, splitDay++),
            groupId: g.id,
            groupName: g.name,
            allowedSubgroupId: sg.id,
            allowedSubgroupIndex: sg.index,
            allGroups: false,
            studentIds: g.students.filter(s => s.subgroupId === sg.id).map(s => s.id),
          })
        }
      }
      else {
        scopes.push({ id: uid(scopeSeed++), ...base(l, li), startedAt: l.startedAt, groupId: g.id, groupName: g.name, allGroups: false, studentIds: g.students.map(s => s.id) })
      }
    }
  })

  const profileById = new Map<string, StudentProfile>()
  students.forEach((s, i) => {
    const p = def.profiles[i]
    if (p)
      profileById.set(s.id, p)
  })

  return { def, students, lessons, assignments, scopes, profileById }
}

const SUBJECTS: Record<string, ComputedSubject> = Object.fromEntries(
  SUBJECT_DEFS.map(def => [def.id, buildSubject(def)]),
)

const PERMISSION_SUBJECT: Record<string, string> = Object.fromEntries(
  SUBJECT_DEFS.map(def => [def.permId, def.id]),
)

function permIdFor(subjectId: string): string {
  return SUBJECTS[subjectId]?.def.permId ?? PERM1
}

// --- Политика аттестации (по предмету) -------------------------------------
function finalPolicyFor(subjectId: string): FinalAssessmentPolicyResponse {
  const def = SUBJECTS[subjectId]?.def
  const mode = def?.finalMode ?? 'COMBINED'
  const bands = def?.finalBands ?? SUBJECT_DEFS[0]!.finalBands
  return {
    enabled: true,
    attendanceMode: mode,
    attendanceRequirementMode: 'PERCENT',
    attendanceMinPercent: def?.finalAttendanceMinPercent ?? 60,
    attendanceMinCount: 0,
    attendanceCountPresent: true,
    attendanceCountLate: true,
    attendanceCountAbsent: false,
    attendanceCountExcused: true,
    bands: bands.map((b, i) => ({ id: finalBandIds[i], ...b })),
  }
}

// --- Построители таблиц -----------------------------------------------------
function audienceOf(subjectId: string): Array<{ groupId: string, groupName: string }> {
  const subj = SUBJECTS[subjectId]
  return (subj?.def.groups ?? []).map(g => ({ groupId: g.id, groupName: g.name }))
}

function tableStudent(s: Student) {
  return {
    id: s.id,
    username: s.username,
    groupId: s.groupId,
    groupName: s.groupName,
    subgroupId: s.subgroupId,
    subgroupIndex: s.subgroupIndex,
  }
}

function buildAttendanceTable(subjectId: string, lessonId?: string): AttendanceTableResponse {
  const subj = SUBJECTS[subjectId]
  if (!subj)
    return emptyAttendanceTable()

  const scopes = lessonId ? subj.scopes.filter(sc => sc.lessonId === lessonId) : subj.scopes
  const indexById = new Map(subj.students.map((s, i) => [s.id, i]))
  const attendances: AttendanceTableResponse['attendances'] = []
  let cid = 10_000
  for (const scope of scopes) {
    for (const sid of scope.studentIds) {
      const status = ATT_LETTER[subj.profileById.get(sid)?.att[scope.lessonIndex] ?? 'P']
      const override = subj.def.attComments?.[`${indexById.get(sid)}:${scope.lessonIndex}`]
      const comment = override ?? (status === 'EXCUSED' ? 'Справка' : undefined)
      attendances!.push({
        id: uid(cid++),
        studentId: sid,
        lessonScopeId: scope.id,
        status,
        ...(comment ? { comment } : {}),
      })
    }
  }

  return {
    highlightPolicy: attendanceHighlightPolicy,
    audience: audienceOf(subjectId),
    students: subj.students.map(tableStudent),
    lessons: scopes.map(sc => ({
      id: sc.id,
      lessonId: sc.lessonId,
      startedAt: sc.startedAt,
      type: sc.type,
      orderIndex: sc.orderIndex,
      topic: sc.topic,
      active: sc.active,
      groupId: sc.groupId,
      groupName: sc.groupName,
      ...(sc.allowedSubgroupId ? { allowedSubgroupId: sc.allowedSubgroupId, allowedSubgroupIndex: sc.allowedSubgroupIndex } : {}),
      allGroups: sc.allGroups,
    })),
    attendances,
  }
}

function studentAttendanceCounts(subjectId: string): StudentAttendanceResponse[] {
  const subj = SUBJECTS[subjectId]
  if (!subj)
    return []
  return subj.students.map((s) => {
    const counts = { present: 0, late: 0, absent: 0, excused: 0 }
    for (const letter of subj.profileById.get(s.id)?.att ?? []) {
      const status = ATT_LETTER[letter]
      if (status === 'PRESENT')
        counts.present++
      else if (status === 'LATE')
        counts.late++
      else if (status === 'ABSENT')
        counts.absent++
      else counts.excused++
    }
    return { studentId: s.id, ...counts }
  })
}

function buildGradingTable(subjectId: string, lessonId?: string): GradingTableResponse {
  const subj = SUBJECTS[subjectId]
  if (!subj)
    return emptyGradingTable()

  const lessons = lessonId ? subj.lessons.filter(l => l.id === lessonId) : subj.lessons
  const scopes = lessonId ? subj.scopes.filter(sc => sc.lessonId === lessonId) : subj.scopes
  const assignments = lessonId ? subj.assignments.filter(a => a.lessonId === lessonId) : subj.assignments
  const requiredAssignments = assignments.filter(a => a.required)
  const optionalAssignments = assignments.filter(a => !a.required)

  const grades: GradingTableResponse['grades'] = []
  let gid = 20_000
  const pushCell = (studentId: string, a: AssignmentResponse, rawScore: number, offset = 0, comment?: string) => {
    grades!.push({
      id: uid(gid++),
      studentId,
      lessonId: a.lessonId,
      assignmentId: a.id,
      awardedLessonId: a.lessonId,
      lessonsOffset: offset,
      score: Math.max(0, Math.min(a.maxPoints ?? 0, rawScore)),
      ...(comment ? { comment } : {}),
    })
  }
  subj.students.forEach((s, si) => {
    const prof = subj.profileById.get(s.id)
    requiredAssignments.forEach((a, rank) => pushCell(s.id, a, prof?.req[rank] ?? 0, prof?.off?.[rank] ?? 0, subj.def.gradeComments?.[`${si}:${rank}`]))
    optionalAssignments.forEach(a => pushCell(s.id, a, prof?.opt ?? 0))
  })

  // Проведения по занятиям (для видимости колонок по секциям и дат).
  interface GradeScope { id: string, groupId: string, allowedSubgroupId?: string, startedAt: string, allGroups: boolean }
  const scopesByLesson = new Map<string, GradeScope[]>()
  for (const sc of scopes) {
    const arr = scopesByLesson.get(sc.lessonId) ?? []
    arr.push({ id: sc.id, groupId: sc.groupId, ...(sc.allowedSubgroupId ? { allowedSubgroupId: sc.allowedSubgroupId } : {}), startedAt: sc.startedAt, allGroups: sc.allGroups })
    scopesByLesson.set(sc.lessonId, arr)
  }

  return {
    penaltyPolicy,
    attendancePolicy,
    highlightPolicy: gradingHighlightPolicy,
    finalAssessmentPolicy: finalPolicyFor(subjectId),
    attendance: studentAttendanceCounts(subjectId),
    audience: audienceOf(subjectId),
    students: subj.students.map(tableStudent),
    lessons: lessons.map(l => ({
      id: l.id,
      type: l.type,
      orderIndex: l.orderIndex,
      topic: l.topic,
      active: l.active,
      scopes: scopesByLesson.get(l.id) ?? [],
    })),
    assignments,
    grades,
  }
}

// --- Отметка присутствия (сессии) ------------------------------------------
const CHECK_IN_STATES = ['CONFIRMED', 'AWAITING_CONFIRMATION', 'OPEN'] as const

function buildCheckInSessions(subjectId: string): CheckInSessionResponse[] {
  const subj = SUBJECTS[subjectId]
  if (!subj)
    return []
  const practiceScopes = subj.scopes.filter(sc => sc.type === PRACTICE)
  const now = Date.now()
  return practiceScopes.slice(0, CHECK_IN_STATES.length).map((sc, i) => {
    const state = CHECK_IN_STATES[i]!
    const isOpen = state === 'OPEN'
    const startedAt = isOpen ? new Date(now).toISOString() : `${sc.startedAt}T10:00:00Z`
    const onTimeEndsAt = isOpen ? new Date(now + 5 * 60_000).toISOString() : `${sc.startedAt}T10:05:00Z`
    const lateEndsAt = isOpen ? new Date(now + 10 * 60_000).toISOString() : `${sc.startedAt}T10:10:00Z`
    return {
      id: uid(500 + i),
      lessonId: sc.lessonId,
      lessonScopeId: sc.id,
      allGroups: sc.allGroups,
      audience: [{
        groupId: sc.groupId,
        groupName: sc.groupName,
        ...(sc.allowedSubgroupId ? { allowedSubgroupId: sc.allowedSubgroupId, allowedSubgroupIndex: sc.allowedSubgroupIndex } : {}),
      }],
      code: String(1000 + i * 111).padStart(4, '0'),
      startedAt,
      onTimeSeconds: 300,
      lateSeconds: 600,
      onTimeEndsAt,
      lateEndsAt,
      ...(i === 0 ? { confirmedAt: `${sc.startedAt}T10:12:00Z` } : {}),
      state,
    }
  })
}

function buildCheckInPreview(subjectId: string, sessionId: string): CheckInPreviewResponse {
  const subj = SUBJECTS[subjectId]!
  const session = buildCheckInSessions(subjectId).find(s => s.id === sessionId)
  const scope = subj.scopes.find(sc => sc.id === session?.lessonScopeId)
  const studentIds = scope?.studentIds ?? subj.students.map(s => s.id)
  const byId = new Map(subj.students.map(s => [s.id, s]))
  return {
    session,
    rows: studentIds.map((sid, i) => ({
      studentId: sid,
      username: byId.get(sid)?.username ?? '—',
      checkInStatus: i % 3 === 2 ? 'LATE' : 'PRESENT',
      checkedInAt: `2025-09-15T10:0${i}:00Z`,
      proposedStatus: i % 4 === 3 ? 'ABSENT' : (i % 3 === 2 ? 'LATE' : 'PRESENT'),
    })),
  }
}

function buildPermission(subjectId: string): TeacherSubjectPermissionResponse {
  return {
    id: permIdFor(subjectId),
    teacherId: DEMO_TEACHER_ID,
    teacherName: DEMO_TEACHER.username,
    subjectId,
    allPermissions: true,
    scopes: [],
    createdAt: CREATED,
    updatedAt: CREATED,
  }
}

function lessonResponse(l: Lesson): LessonResponse {
  const subj = SUBJECTS[l.subjectId]
  const assignments = (subj?.assignments ?? []).filter(a => a.lessonId === l.id)
  const scopes = (subj?.scopes ?? []).filter(sc => sc.lessonId === l.id).map(sc => ({
    id: sc.id,
    groupId: sc.groupId,
    groupName: sc.groupName,
    ...(sc.allowedSubgroupId ? { allowedSubgroupId: sc.allowedSubgroupId, allowedSubgroupIndex: sc.allowedSubgroupIndex } : {}),
    startedAt: sc.startedAt,
    allGroups: sc.allGroups,
  }))
  return {
    id: l.id,
    subjectId: l.subjectId,
    subjectName: l.subjectName,
    type: l.type,
    orderIndex: l.orderIndex,
    topic: l.topic,
    active: l.active,
    scopes,
    assignments,
    createdAt: CREATED,
    updatedAt: CREATED,
  }
}

function emptyAttendanceTable(): AttendanceTableResponse {
  return { highlightPolicy: attendanceHighlightPolicy, audience: [], students: [], lessons: [], attendances: [] }
}

function emptyGradingTable(): GradingTableResponse {
  return {
    penaltyPolicy,
    attendancePolicy,
    highlightPolicy: gradingHighlightPolicy,
    finalAssessmentPolicy: finalPolicyFor(''),
    attendance: [],
    audience: [],
    students: [],
    lessons: [],
    assignments: [],
    grades: [],
  }
}

// --- Роутер ----------------------------------------------------------------
export interface DemoResult {
  status?: number
  body: unknown
}

const READ_ONLY: DemoResult = {
  status: 403,
  body: { message: 'В демо-режиме доступен только просмотр. Изменения отключены.' },
}

function paged<T>(content: T[], query: Record<string, unknown> = {}): { content: T[], page: PageMetadata } {
  const size = Math.max(1, Number(query.size ?? 20) || 20)
  const number = Math.max(0, Number(query.page ?? 0) || 0)
  const total = content.length
  const slice = content.slice(number * size, number * size + size)
  return {
    content: slice,
    page: { size, number, totalElements: total, totalPages: Math.max(1, Math.ceil(total / size)) },
  }
}

function includesCi(haystack: string, needle: unknown): boolean {
  if (needle == null || needle === '')
    return true
  return haystack.toLowerCase().includes(String(needle).toLowerCase())
}

function subjectFromPermission(query: Record<string, unknown>): string | null {
  const pid = String(query.permissionId ?? '')
  return PERMISSION_SUBJECT[pid] ?? null
}

const ALL_LESSONS: Lesson[] = Object.values(SUBJECTS).flatMap(s => s.lessons)
const ALL_ASSIGNMENTS: AssignmentResponse[] = Object.values(SUBJECTS).flatMap(s => s.assignments)

/**
 * Возвращает демо-ответ для (method, path, query) или null, если путь не
 * обслуживается демо-набором (тогда прокси вернёт пустой безопасный ответ).
 * `path` — без ведущего слэша, например `api/subjects`.
 */
export function getDemoResponse(method: string, path: string, query: Record<string, unknown>): DemoResult | null {
  const p = path.replace(/^\/+/, '').replace(/\/+$/, '')

  if (method !== 'GET') {
    // Демка только для чтения.
    return READ_ONLY
  }

  // --- Справочники ---
  if (p === 'api/subjects') {
    const subjects: SubjectPageResponse[] = SUBJECT_DEFS
      .filter(d => includesCi(d.name, query.name))
      .map(d => ({ id: d.id, name: d.name, description: d.description, createdAt: CREATED, updatedAt: CREATED }))
    return { body: paged(subjects, query) }
  }

  if (p === 'api/groups') {
    const rows: GroupPageResponse[] = ALL_GROUPS
      .filter(g => includesCi(g.name, query.name))
      .map(g => ({ id: g.id, name: g.name, createdAt: CREATED, updatedAt: CREATED }))
    return { body: paged(rows, query) }
  }

  if (p === 'api/groups/by-subject') {
    const subjectId = String(query.subjectId ?? '')
    const source = SUBJECTS[subjectId]?.def.groups ?? ALL_GROUPS
    const groups: GroupWithSubgroupsResponse[] = source.map(g => ({ id: g.id, name: g.name, subgroups: g.subgroups }))
    return { body: groups }
  }

  const groupById = p.match(/^api\/groups\/([^/]+)$/)
  if (groupById) {
    const g = ALL_GROUPS.find(x => x.id === groupById[1])
    if (g) {
      const students: StudentResponse[] = g.students.map(s => ({ id: s.id, username: s.username, groupId: s.groupId, subgroupId: s.subgroupId, createdAt: CREATED, updatedAt: CREATED }))
      const body: GroupResponse = { id: g.id, name: g.name, subgroups: g.subgroups, students, createdAt: CREATED, updatedAt: CREATED }
      return { body }
    }
    return { status: 404, body: { message: 'Группа не найдена' } }
  }

  if (p === 'api/subgroups') {
    const g = ALL_GROUPS.find(x => x.id === String(query.groupId ?? ''))
    const subgroups: SubgroupResponse[] = g?.subgroups ?? []
    return { body: subgroups }
  }

  if (p === 'api/teachers')
    return { body: paged<TeacherResponse>([DEMO_TEACHER], query) }

  // --- Права ---
  if (p === 'api/teacher-subject-permissions/single')
    return { body: buildPermission(String(query.subjectId ?? '')) }

  if (p === 'api/teacher-subject-permissions')
    return { body: [buildPermission(String(query.subjectId ?? ''))] }

  // --- Занятия и задания ---
  if (p === 'api/lessons') {
    const subjectId = subjectFromPermission(query)
    return { body: (subjectId ? SUBJECTS[subjectId]?.lessons ?? [] : []).map(lessonResponse) }
  }

  const lessonById = p.match(/^api\/lessons\/([^/]+)$/)
  if (lessonById) {
    const l = ALL_LESSONS.find(x => x.id === lessonById[1])
    if (l)
      return { body: lessonResponse(l) }
    return { status: 404, body: { message: 'Занятие не найдено' } }
  }

  if (p === 'api/assignments') {
    const lessonId = String(query.lessonId ?? '')
    return { body: ALL_ASSIGNMENTS.filter(a => a.lessonId === lessonId) }
  }

  // --- Таблицы ---
  if (p === 'api/attendances') {
    const subjectId = subjectFromPermission(query)
    const lessonId = query.lessonId ? String(query.lessonId) : undefined
    return { body: subjectId ? buildAttendanceTable(subjectId, lessonId) : emptyAttendanceTable() }
  }

  if (p === 'api/grades') {
    const subjectId = subjectFromPermission(query)
    const lessonId = query.lessonId ? String(query.lessonId) : undefined
    return { body: subjectId ? buildGradingTable(subjectId, lessonId) : emptyGradingTable() }
  }

  if (p === 'api/results') {
    const subjectId = subjectFromPermission(query)
    const lessonId = query.lessonId ? String(query.lessonId) : undefined
    if (!subjectId)
      return { body: { grading: emptyGradingTable(), attendance: emptyAttendanceTable() } }
    return { body: { grading: buildGradingTable(subjectId, lessonId), attendance: buildAttendanceTable(subjectId, lessonId) } }
  }

  // --- Отметка присутствия ---
  if (p === 'api/check-in-sessions') {
    const subjectId = subjectFromPermission(query)
    if (!subjectId)
      return { body: [] }
    const lessonId = query.lessonId ? String(query.lessonId) : undefined
    const lessonScopeId = query.lessonScopeId ? String(query.lessonScopeId) : undefined
    const sessions = buildCheckInSessions(subjectId).filter(s =>
      (!lessonId || s.lessonId === lessonId)
      && (!lessonScopeId || s.lessonScopeId === lessonScopeId),
    )
    return { body: sessions }
  }

  const previewMatch = p.match(/^api\/check-in-sessions\/([^/]+)\/preview$/)
  if (previewMatch) {
    const sid = previewMatch[1]!
    for (const subjectId of Object.keys(SUBJECTS)) {
      if (buildCheckInSessions(subjectId).some(s => s.id === sid))
        return { body: buildCheckInPreview(subjectId, sid) }
    }
    return { status: 404, body: { message: 'Сессия не найдена' } }
  }

  const sessionMatch = p.match(/^api\/check-in-sessions\/([^/]+)$/)
  if (sessionMatch) {
    const sid = sessionMatch[1]!
    for (const subjectId of Object.keys(SUBJECTS)) {
      const s = buildCheckInSessions(subjectId).find(x => x.id === sid)
      if (s)
        return { body: s }
    }
    return { status: 404, body: { message: 'Сессия не найдена' } }
  }

  // --- Политики ---
  if (/^api\/attendance-policy\/subjects\/[^/]+$/.test(p))
    return { body: attendancePolicy }
  if (/^api\/attendance-highlight-policy\/subjects\/[^/]+$/.test(p))
    return { body: attendanceHighlightPolicy }
  if (/^api\/grading-highlight-policy\/subjects\/[^/]+$/.test(p))
    return { body: gradingHighlightPolicy }
  if (/^api\/penalty-policy\/subjects\/[^/]+$/.test(p))
    return { body: penaltyPolicy }
  const finalPolicyMatch = p.match(/^api\/final-assessment-policy\/subjects\/([^/]+)$/)
  if (finalPolicyMatch)
    return { body: finalPolicyFor(finalPolicyMatch[1]!) }
  if (/^api\/check-in-policy\/subjects\/[^/]+$/.test(p))
    return { body: checkInPolicy }

  // Неизвестный GET — безопасный пустой ответ, чтобы страница не падала.
  return { body: {} }
}
