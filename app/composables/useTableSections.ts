export interface SectionKey {
  key: string
  label: string
  groupId?: string
  subgroupId?: string
  subgroupIndex?: number
}

interface SectionInput {
  groupId?: string
  groupName?: string
  subgroupId?: string
  subgroupIndex?: number
}

export function sectionKeyOf(s: SectionInput): SectionKey {
  const key = `${s.groupName ?? 'Без группы'}|${s.subgroupIndex ?? ''}`
  const label = s.subgroupIndex
    ? `${s.groupName ?? 'Без группы'} — Подгруппа ${s.subgroupIndex}`
    : `${s.groupName ?? 'Без группы'} — Вся группа`
  return { key, label, groupId: s.groupId, subgroupId: s.subgroupId, subgroupIndex: s.subgroupIndex }
}

interface ScopeLike {
  allGroups?: boolean
  groupId?: string
  allowedSubgroupId?: string
}

export function scopeVisibleForSection(scope: ScopeLike, section: SectionKey): boolean {
  if (scope.allGroups)
    return true
  if (!section.groupId || !scope.groupId)
    return false
  if (scope.groupId !== section.groupId)
    return false
  if (scope.allowedSubgroupId == null)
    return true
  return scope.allowedSubgroupId === section.subgroupId
}

export function groupBySection<T extends SectionInput>(items: T[]): { meta: SectionKey, items: T[] }[] {
  const map = new Map<string, { meta: SectionKey, items: T[] }>()
  for (const it of items) {
    const meta = sectionKeyOf(it)
    const bucket = map.get(meta.key) ?? { meta, items: [] }
    bucket.items.push(it)
    map.set(meta.key, bucket)
  }
  return [...map.values()].sort((a, b) => a.meta.label.localeCompare(b.meta.label, 'ru'))
}
