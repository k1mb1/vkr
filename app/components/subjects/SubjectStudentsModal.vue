<script setup lang="ts">
import type { AttachGroupToSubjectResponse } from '#shared/types/backend'
import { computed, ref } from 'vue'
import { useStudentGroups } from '~/composables/api/useStudentsGroups'
import { attachGroupToSubject, useSubjectAttendance } from '~/composables/api/useSubjectsApi'

const props = defineProps<{
  subjectId: string
}>()

const toast = useToast()
const { toastError } = useApiError()

const { data: groupsData, pending: groupsPending } = useStudentGroups({ size: 100 })
const { data: attendanceData, pending: studentsPending, refresh: refreshStudents } = useSubjectAttendance(computed(() => props.subjectId))

const groupOptions = computed(() =>
  (groupsData.value?.content ?? []).map(g => ({ label: g.name, value: g.id })),
)

const attachedStudents = computed(() => attendanceData.value?.students ?? [])

const studentSearch = ref('')
const filteredStudents = computed(() => {
  const q = studentSearch.value.trim().toLowerCase()
  if (!q)
    return attachedStudents.value
  return attachedStudents.value.filter(s => s.username.toLowerCase().includes(q))
})

const selectedGroupId = ref<string | undefined>(undefined)
const attachPending = ref(false)
const lastAttachResult = ref<AttachGroupToSubjectResponse | null>(null)

async function onAttachGroup() {
  if (!selectedGroupId.value || attachPending.value)
    return
  attachPending.value = true
  const { data: result, error } = await attachGroupToSubject(props.subjectId, selectedGroupId.value)
  attachPending.value = false
  if (error.value) {
    toastError(error.value, 'Ошибка')
    return
  }
  lastAttachResult.value = result.value
  toast.add({
    title: 'Группа прикреплена',
    description: `${result.value!.groupName}: добавлено ${result.value!.addedStudentsCount} студентов. Всего: ${result.value!.totalStudentsInSubject}.`,
    color: 'success',
    icon: 'i-lucide-check',
  })
  selectedGroupId.value = undefined
  await refreshStudents()
}
</script>

<template>
  <UModal title="Студенты предмета">
    <UButton
      icon="i-lucide-users-round"
      color="neutral"
      variant="soft"
    >
      Управление
    </UButton>

    <template #body>
      <div class="flex flex-col gap-5">
        <!-- Attach group section -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold">
            Прикрепить группу
          </p>
          <div class="flex flex-wrap items-end gap-3">
            <USelectMenu
              v-model="selectedGroupId"
              :items="groupOptions"
              value-key="value"
              searchable
              :loading="groupsPending"
              :disabled="groupsPending || attachPending"
              placeholder="Выберите группу"
              class="w-64"
            />
            <UButton
              icon="i-lucide-link"
              :loading="attachPending"
              :disabled="!selectedGroupId || attachPending"
              @click="onAttachGroup"
            >
              Прикрепить
            </UButton>
          </div>

          <UAlert
            v-if="lastAttachResult"
            color="success"
            variant="soft"
            icon="i-lucide-users"
            :title="`Группа «${lastAttachResult.groupName}» прикреплена`"
            :description="`Добавлено студентов: ${lastAttachResult.addedStudentsCount}. Всего в предмете: ${lastAttachResult.totalStudentsInSubject}.`"
          />
        </div>

        <USeparator />

        <!-- Students list -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold">
              Прикреплённые студенты
            </p>
            <UBadge
              :label="studentSearch ? `${filteredStudents.length} из ${attachedStudents.length}` : String(attachedStudents.length)"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </div>

          <UInput
            v-model="studentSearch"
            placeholder="Поиск по имени..."
            icon="i-lucide-search"
            color="neutral"
            variant="outline"
            :disabled="studentsPending"
          />

          <!-- Loading -->
          <div v-if="studentsPending" class="flex flex-col gap-2">
            <USkeleton v-for="i in 4" :key="i" class="h-10 w-full rounded-md" />
          </div>

          <!-- No students attached -->
          <div v-else-if="attachedStudents.length === 0" class="py-6">
            <UEmpty
              icon="i-lucide-user-x"
              title="Нет студентов"
              description="Прикрепите группу, чтобы добавить студентов к предмету."
              variant="naked"
            />
          </div>

          <!-- No search results -->
          <div v-else-if="filteredStudents.length === 0" class="py-6">
            <UEmpty
              icon="i-lucide-search"
              :title="`«${studentSearch}» не найден`"
              description="Попробуйте другой запрос."
              variant="naked"
            />
          </div>

          <!-- List -->
          <div
            v-else
            class="max-h-64 divide-y divide-default overflow-y-auto rounded-md border border-default"
          >
            <div
              v-for="student in filteredStudents"
              :key="student.id"
              class="flex items-center gap-3 px-3 py-2.5"
            >
              <UIcon name="i-lucide-user" class="size-4 shrink-0 text-muted" />
              <span class="text-sm">{{ student.username }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
