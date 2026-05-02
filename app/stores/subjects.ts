import type { SubjectResponse } from '#shared/types/backend'
import { useSubjectsByTeacher } from '~/composables/api/useSubjectsApi'

export const useSubjectsStore = defineStore('subjects', () => {
  const { user } = useOidcAuth()

  const teacherId = computed(() => {
    const value = user.value?.sub
    return typeof value === 'string' && value.length > 0 ? value : null
  })

  const safeTeacherId = computed(() => teacherId.value ?? '')

  const {
    data: activeSubjectsData,
    pending: activeSubjectsPending,
    error: activeSubjectsError,
    refresh: refreshActiveSubjects,
  } = useSubjectsByTeacher(safeTeacherId, { archived: false }, { immediate: false })

  const {
    data: archivedSubjectsData,
    pending: archivedSubjectsPending,
    error: archivedSubjectsError,
    refresh: refreshArchivedSubjects,
  } = useSubjectsByTeacher(safeTeacherId, { archived: true }, { immediate: false })

  const archivedLoaded = ref(false)
  const activeSubject = ref<SubjectResponse | null>(null)

  const activeSubjects = computed<SubjectResponse[]>(() => activeSubjectsData.value ?? [])
  const archivedSubjects = computed<SubjectResponse[]>(() => archivedSubjectsData.value ?? [])

  async function loadActiveSubjects() {
    if (!teacherId.value)
      return

    await refreshActiveSubjects()
  }

  async function loadArchivedSubjects() {
    if (!teacherId.value)
      return

    archivedLoaded.value = true
    await refreshArchivedSubjects()
  }

  async function loadArchivedSubjectsOnce() {
    if (archivedLoaded.value)
      return

    await loadArchivedSubjects()
  }

  async function refreshForCurrentTab(isArchived: boolean) {
    if (isArchived)
      await loadArchivedSubjects()
    else
      await loadActiveSubjects()
  }

  function setActiveSubject(subject: SubjectResponse | null) {
    activeSubject.value = subject
  }

  watch(teacherId, async (value) => {
    if (!value) {
      archivedLoaded.value = false
      activeSubject.value = null
      return
    }

    archivedLoaded.value = false
    await loadActiveSubjects()
  }, { immediate: true })

  return {
    teacherId,
    activeSubjects,
    archivedSubjects,
    activeSubjectsPending,
    archivedSubjectsPending,
    activeSubjectsError,
    archivedSubjectsError,
    archivedLoaded,
    activeSubject,
    loadActiveSubjects,
    loadArchivedSubjects,
    loadArchivedSubjectsOnce,
    refreshForCurrentTab,
    setActiveSubject,
  }
})
