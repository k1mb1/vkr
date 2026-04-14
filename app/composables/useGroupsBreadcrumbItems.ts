import type { InjectionKey, Ref } from 'vue'

const groupsBreadcrumbLabelKey: InjectionKey<Ref<string | null>> = Symbol('groups-breadcrumb-label')

export function provideGroupsBreadcrumbLabel() {
  const label = ref<string | null>(null)
  provide(groupsBreadcrumbLabelKey, label)
  return label
}

export function useGroupsBreadcrumbLabel() {
  return inject(groupsBreadcrumbLabelKey, ref<string | null>(null))
}

export function useGroupsBreadcrumbItems(activeGroupName: Ref<string | null>) {
  const route = useRoute()

  return computed(() => {
    const items = [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Groups', to: '/dashboard/groups' },
    ]

    const uuid = route.params.uuid

    if (typeof uuid === 'string' && uuid.length > 0) {
      items.push({
        label: activeGroupName.value || 'Group',
        to: `/dashboard/groups/${uuid}`,
      })
    }

    return items
  })
}
