import type { User } from '#auth-utils'
import type { components } from '#open-fetch-schemas/backend'

type TeacherSubjectPermissionResponse = components['schemas']['TeacherSubjectPermissionResponse']
type LessonType = NonNullable<TeacherSubjectPermissionResponse['allowedLessonType']>

interface SelectOption<T> { value: T, label: string }

export function useMyPermissionScope(subjectId: string) {
  const { user } = useOidcAuth()
  const { sub: myTeacherId } = user.value as User

  const { permissions, pending: loadingScope } = usePermissions(
    computed(() => subjectId),
    computed(() => myTeacherId ?? ''),
  )

  // Unique groups from my own permissions
  const groupOptions = computed<SelectOption<string>[]>(() =>
    permissions.value
      .filter((p, i, a) => a.findIndex(x => x.groupId === p.groupId) === i)
      .map(p => ({ value: p.groupId!, label: p.groupName ?? '—' })),
  )

  /**
   * Subgroup options for a given groupId.
   * Returns null if the teacher has unrestricted subgroup access for that group
   * (caller should render the normal SubgroupSelect in that case).
   */
  function subgroupOptionsFor(groupId: string): SelectOption<string>[] | null {
    const groupPerms = permissions.value.filter(p => p.groupId === groupId)
    if (groupPerms.some(p => !p.allowedSubgroupId))
      return null // teacher has full subgroup access

    return groupPerms
      .filter((p, i, a) => p.allowedSubgroupId && a.findIndex(x => x.allowedSubgroupId === p.allowedSubgroupId) === i)
      .map(p => ({ value: p.allowedSubgroupId!, label: `Подгруппа ${p.allowedSubgroupIndex}` }))
  }

  /**
   * Lesson type options for a given groupId + optional subgroupId.
   * Includes "Все типы" (null) only if the teacher has unrestricted lesson type access.
   */
  function lessonTypeOptionsFor(
    groupId: string,
    subgroupId: string | null | undefined,
  ): SelectOption<LessonType | null>[] {
    const groupPerms = permissions.value.filter((p) => {
      if (p.groupId !== groupId)
        return false
      // If caller selected a specific subgroup, only consider perms that cover it
      if (subgroupId && p.allowedSubgroupId && p.allowedSubgroupId !== subgroupId)
        return false
      return true
    })

    if (groupPerms.some(p => !p.allowedLessonType)) {
      return [
        { value: null, label: 'Все типы' },
        { value: 'LECTURE', label: 'Лекция' },
        { value: 'PRACTICE', label: 'Практика' },
      ]
    }

    const types = [
      ...new Set(
        groupPerms.map(p => p.allowedLessonType).filter((t): t is LessonType => !!t),
      ),
    ]
    return types.map(t => ({ value: t, label: t === 'LECTURE' ? 'Лекция' : 'Практика' }))
  }

  return {
    groupOptions,
    subgroupOptionsFor,
    lessonTypeOptionsFor,
    loadingScope,
  }
}
