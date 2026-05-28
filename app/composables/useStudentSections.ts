interface StudentLike {
  id?: string
  groupId?: string
  groupName?: string
  subgroupId?: string
  subgroupIndex?: number
}

export interface StudentSection<S extends StudentLike> {
  key: string
  label: string
  students: S[]
}

/**
 * Группирует студентов по (groupId, subgroupId) для отображения в таблицах
 * посещаемости и оценок. Подписи учитывают, является ли таблица мульти-групповой.
 * Секции «без подгруппы» идут первыми, затем — алфавитно.
 */
export function useStudentSections<S extends StudentLike>(
  students: Ref<S[]>,
): ComputedRef<StudentSection<S>[]> {
  return computed(() => {
    const hasMultipleGroups = new Set(students.value.map(s => s.groupId)).size > 1

    const grouped = new Map<string, S[]>()
    for (const s of students.value) {
      const key = `${s.groupId ?? '__none__'}:${s.subgroupId ?? '__none__'}`
      const bucket = grouped.get(key) ?? []
      bucket.push(s)
      grouped.set(key, bucket)
    }

    const result: StudentSection<S>[] = []
    for (const [key, list] of grouped) {
      const [, subgroupId] = key.split(':')
      const first = list[0]
      let label = ''

      if (hasMultipleGroups && first?.groupName)
        label = first.groupName

      if (subgroupId !== '__none__') {
        const idx = first?.subgroupIndex
        const subgroupLabel = idx != null ? `Подгруппа ${idx}` : 'Подгруппа'
        label = label ? `${label} · ${subgroupLabel}` : subgroupLabel
      }

      if (!label)
        label = 'Без подгруппы'

      result.push({ key, label, students: list })
    }

    result.sort((a, b) => {
      const aNoSubgroup = a.key.endsWith('__none__')
      const bNoSubgroup = b.key.endsWith('__none__')
      if (aNoSubgroup && !bNoSubgroup)
        return -1
      if (!aNoSubgroup && bNoSubgroup)
        return 1
      return a.label.localeCompare(b.label, 'ru')
    })

    return result
  })
}
