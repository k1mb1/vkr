type GroupAccessMode = 'any' | 'all'

function normalizeGroups(groups: string[] = []): string[] {
  return groups
    .map(group => group.trim().toUpperCase())
    .filter(Boolean)
}

export function useGroupAccess() {
  const { user } = useOidcAuth()

  const userGroups = computed(() => normalizeGroups(user.value?.groups ?? []))

  function hasGroups(requiredGroups: string[] = [], mode: GroupAccessMode = 'any'): boolean {
    const normalizedRequired = normalizeGroups(requiredGroups)

    if (!normalizedRequired.length) {
      return true
    }

    if (mode === 'all') {
      return normalizedRequired.every(group => userGroups.value.includes(group))
    }

    return normalizedRequired.some(group => userGroups.value.includes(group))
  }

  const isAdmin = computed(() => hasGroups(['ADMIN']))

  return {
    userGroups,
    hasGroups,
    isAdmin,
  }
}
