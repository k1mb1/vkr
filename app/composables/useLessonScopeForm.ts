import type { components } from '#open-fetch-schemas/backend'
import type { SchemaFor } from '~/utils/validation'
import * as v from 'valibot'

type LessonScopeAudienceRequest = components['schemas']['AttendanceAudienceScope']
type GroupWithSubgroupsResponse = components['schemas']['GroupWithSubgroupsResponse']

/** Один новый scope для POST `/api/lessons/{lessonId}/scopes` */
export interface NewLessonScope {
  audience?: LessonScopeAudienceRequest
  startedAt: string
}

export type ScopeMode = 'all' | 'groups'

export interface SubgroupEntry {
  subgroupId: string
  index: number
  date: string
}

export interface GroupScopeEntry {
  groupId: string
  groupName: string
  subgroups: { id: string, index: number }[]
  /** одна дата на всю группу (когда splitBySubgroups=false) */
  date: string
  /** если true — у каждой подгруппы своя дата */
  splitBySubgroups: boolean
  subgroupEntries: SubgroupEntry[]
}

export interface LessonScopeFormState {
  mode: ScopeMode
  allGroupsDate: string
  groupEntries: GroupScopeEntry[]
}

export const LessonScopeFormSchema: SchemaFor<LessonScopeFormState> = v.object({
  mode: v.picklist(['all', 'groups'] as const),
  allGroupsDate: v.string(),
  groupEntries: v.array(v.object({
    groupId: v.string(),
    groupName: v.string(),
    subgroups: v.array(v.object({ id: v.string(), index: v.number() })),
    date: v.string(),
    splitBySubgroups: v.boolean(),
    subgroupEntries: v.array(v.object({
      subgroupId: v.string(),
      index: v.number(),
      date: v.string(),
    })),
  })),
})

export function initialLessonScopeFormState(): LessonScopeFormState {
  return { mode: 'all', allGroupsDate: '', groupEntries: [] }
}

export function initLessonScopeGroups(state: LessonScopeFormState, groups: GroupWithSubgroupsResponse[]) {
  state.groupEntries = groups.map(g => ({
    groupId: g.id!,
    groupName: g.name ?? g.id ?? '',
    subgroups: (g.subgroups ?? []).map(s => ({ id: s.id!, index: s.index ?? 0 })),
    date: '',
    splitBySubgroups: false,
    subgroupEntries: (g.subgroups ?? []).map(s => ({
      subgroupId: s.id!,
      index: s.index ?? 0,
      date: '',
    })),
  }))
}

export function validateLessonScopeForm(state: LessonScopeFormState): string[] {
  const errs: string[] = []

  if (state.mode === 'all') {
    if (!state.allGroupsDate)
      errs.push('Укажите дату проведения')
    return errs
  }

  if (!state.groupEntries.length)
    errs.push('К предмету не привязаны группы')

  for (const entry of state.groupEntries) {
    if (!entry.splitBySubgroups) {
      if (!entry.date)
        errs.push(`Укажите дату для группы «${entry.groupName}»`)
    }
    else {
      for (const sub of entry.subgroupEntries) {
        if (!sub.date)
          errs.push(`Укажите дату для подгруппы ${sub.index} группы «${entry.groupName}»`)
      }
    }
  }

  return errs
}

export function buildLessonScopeRequests(state: LessonScopeFormState): NewLessonScope[] {
  if (state.mode === 'all') {
    return [{ startedAt: state.allGroupsDate }]
  }

  const result: NewLessonScope[] = []

  for (const entry of state.groupEntries) {
    if (!entry.splitBySubgroups) {
      result.push({
        startedAt: entry.date,
        audience: { groupId: entry.groupId },
      })
    }
    else {
      for (const sub of entry.subgroupEntries) {
        result.push({
          startedAt: sub.date,
          audience: { groupId: entry.groupId, allowedSubgroupId: sub.subgroupId },
        })
      }
    }
  }

  return result
}
