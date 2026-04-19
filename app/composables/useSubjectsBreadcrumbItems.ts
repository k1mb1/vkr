import type { InjectionKey, Ref } from 'vue'

const subjectsBreadcrumbLabelKey: InjectionKey<Ref<string | null>> = Symbol('subjects-breadcrumb-label')

export function provideSubjectsBreadcrumbLabel() {
  const label = ref<string | null>(null)
  provide(subjectsBreadcrumbLabelKey, label)
  return label
}

export function useSubjectsBreadcrumbLabel() {
  return inject(subjectsBreadcrumbLabelKey, ref<string | null>(null))
}

export function useSubjectsBreadcrumbItems(activeSubjectName: Ref<string | null>) {
  const route = useRoute()

  return computed(() => {
    const items = [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Subjects', to: '/dashboard/subjects' },
    ]

    const uuid = route.params.uuid

    if (typeof uuid === 'string' && uuid.length > 0) {
      items.push({
        label: activeSubjectName.value || 'Subject',
        to: `/dashboard/subjects/${uuid}`,
      })
    }

    return items
  })
}
