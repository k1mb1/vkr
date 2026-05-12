import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import * as v from 'valibot'
import { arrayMinLength, string, uuidV4 } from '~/utils/validation'

type GroupResponse = components['schemas']['GroupResponse']
type StudentResponse = components['schemas']['StudentResponse']
type UpdateGroupRequest = components['schemas']['UpdateGroupRequest']

export type EditSchema = v.InferOutput<typeof UpdateGroupRequestSchema>

export const UpdateGroupRequestSchema: SchemaFor<UpdateGroupRequest> = v.object({
  groupName: string('Введите название группы'),

  students: arrayMinLength(
    v.object({
      id: v.optional(uuidV4('Некорректный UUID студента')),
      username: string('Введите username студента'),
      subgroupId: v.optional(uuidV4('Некорректный UUID подгруппы')),
    }),
    1,
    'Добавьте хотя бы одного студента',
  ),
})

export interface UseGroupDetailReturn {
  group: ComputedRef<GroupResponse | null>
  pending: Ref<boolean>
  error: Ref<Error | undefined | null>
  refresh: () => Promise<void>

  isEditing: Ref<boolean>
  editLoading: Ref<boolean>
  showDiscardModal: Ref<boolean>

  draft: EditSchema
  editFormRef: Ref<Form<typeof UpdateGroupRequestSchema> | null>

  enterEditMode: () => void
  hasDraftChanges: () => boolean
  exitEditMode: () => void
  confirmDiscardChanges: () => void
  cancelDiscardChanges: () => void

  displayStudents: ComputedRef<StudentResponse[]>

  updateDraftStudentUsername: (studentId: string | null, username: string) => void
  updateDraftStudentSubgroup: (draftIndex: number, subgroupId: string | null) => void
  removeDraftStudent: (studentId: string | null) => void

  addDraftStudents: (raw: string, subgroupId: string | undefined) => void
  handleAddDraftStudents: (input: Ref<string>, activeSubgroupId: ComputedRef<string | undefined>) => void
  handleAddDraftPaste: (e: ClipboardEvent, input: Ref<string>, activeSubgroupId: ComputedRef<string | undefined>) => void

  handlePatch: () => Promise<void>

  deletingGroup: Ref<boolean>
  deleteGroupPending: Ref<boolean>
  onDeleteGroup: (groupId: string) => Promise<void>
}

export function useGroupDetail(groupId: ComputedRef<string>): UseGroupDetailReturn {
  const toast = useToast()
  const { toastError } = useApiError()

  const { data, pending, error, refresh } = useBackend('/api/groups/{id}', {
    method: 'GET',
    path: { id: groupId },
  })

  const group = computed<GroupResponse | null>(() => data.value ?? null)

  // ── Editing state ──────────────────────────────────────────
  const isEditing = ref(false)
  const editLoading = ref(false)
  const showDiscardModal = ref(false)

  const draft = reactive<EditSchema>({
    groupName: '',
    students: [],
  })

  const editFormRef = useTemplateRef<Form<typeof UpdateGroupRequestSchema>>('editForm')

  function enterEditMode() {
    if (!group.value)
      return
    draft.groupName = group.value.name ?? ''
    draft.students = (group.value.students ?? []).map(s => ({
      id: s.id,
      username: s.username ?? '',
      subgroupId: s.subgroupId ?? undefined,
    }))
    isEditing.value = true
  }

  function hasDraftChanges(): boolean {
    if (!group.value)
      return false
    if (draft.groupName.trim() !== group.value.name)
      return true
    if (draft.students.length !== group.value.students?.length)
      return true
    return draft.students.some((ds, i) => {
      const gs = group.value?.students?.[i]
      return (
        !gs || ds.username !== gs.username || (ds.subgroupId ?? null) !== gs.subgroupId
      )
    })
  }

  function exitEditMode() {
    if (hasDraftChanges()) {
      showDiscardModal.value = true
      return
    }
    isEditing.value = false
  }

  function confirmDiscardChanges() {
    showDiscardModal.value = false
    isEditing.value = false
  }

  function cancelDiscardChanges() {
    showDiscardModal.value = false
  }

  const displayStudents = computed<StudentResponse[]>(() => {
    return isEditing.value
      ? draft.students.map(s => ({
          id: s.id,
          username: s.username,
          subgroupId: s.subgroupId,
        }))
      : (group.value?.students ?? [])
  })

  function updateDraftStudentUsername(studentId: string | null, username: string) {
    const student = draft.students.find(s => s.id === (studentId ?? undefined))
    if (student)
      student.username = username.trim()
  }

  function updateDraftStudentSubgroup(draftIndex: number, subgroupId: string | null) {
    const student = draft.students[draftIndex]
    if (student) {
      student.subgroupId = subgroupId ?? undefined
    }
  }

  function removeDraftStudent(studentId: string | null) {
    const idx = draft.students.findIndex(s => s.id === (studentId ?? undefined))
    if (idx !== -1)
      draft.students.splice(idx, 1)
  }

  const { addStudents: addDraftStudentsRaw, handlePaste: handleDraftPaste } = useStudentInput<EditSchema['students'][number]>({ separator: /\n+/ })

  function addDraftStudents(raw: string, subgroupId: string | undefined) {
    addDraftStudentsRaw(raw, subgroupId, draft.students, (username, sid) => ({
      id: undefined,
      username,
      subgroupId: sid as string | undefined,
    }))
  }

  function handleAddDraftStudents(input: Ref<string>, activeSubgroupId: ComputedRef<string | undefined>) {
    const text = input.value.trim()
    if (!text)
      return
    addDraftStudents(text, activeSubgroupId.value)
    input.value = ''
  }

  function handleAddDraftPaste(e: ClipboardEvent, input: Ref<string>, activeSubgroupId: ComputedRef<string | undefined>) {
    const handled = handleDraftPaste(e, activeSubgroupId.value, draft.students, (username, sid) => ({
      id: undefined,
      username,
      subgroupId: sid as string | undefined,
    }))
    if (handled)
      input.value = ''
  }

  async function handlePatch() {
    const form = editFormRef.value
    if (!form)
      return

    const data = await form.validate({ transform: true })
    if (!data)
      return

    editLoading.value = true
    try {
      const result = await useBackend('/api/groups/{id}', {
        method: 'patch',
        path: { id: groupId.value },
        body: data,
      })
      if (result.error.value) {
        toastError(result.error.value)
        return
      }
      isEditing.value = false
      await refresh()
    }
    finally {
      editLoading.value = false
    }
  }

  // ── Group deletion ─────────────────────────────────────────
  const deletingGroup = ref(false)
  const deleteGroupPending = ref(false)

  async function onDeleteGroup(id: string) {
    if (deleteGroupPending.value)
      return
    deleteGroupPending.value = true
    const { error } = await useBackend('/api/groups/{id}', {
      method: 'DELETE',
      path: { id },
    })
    deleteGroupPending.value = false
    if (error.value) {
      toastError(error.value, 'Ошибка')
      return
    }
    toast.add({
      title: 'Группа удалена',
      color: 'success',
      icon: 'i-lucide-check',
    })
    await navigateTo('/dashboard/groups')
  }

  return {
    group,
    pending,
    error,
    refresh,

    isEditing,
    editLoading,
    showDiscardModal,

    draft,
    editFormRef,

    enterEditMode,
    hasDraftChanges,
    exitEditMode,
    confirmDiscardChanges,
    cancelDiscardChanges,

    displayStudents,

    updateDraftStudentUsername,
    updateDraftStudentSubgroup,
    removeDraftStudent,

    addDraftStudents,
    handleAddDraftStudents,
    handleAddDraftPaste,

    handlePatch,

    deletingGroup,
    deleteGroupPending,
    onDeleteGroup,
  }
}
