<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { TableColumn } from '@nuxt/ui'
import type { FetchError } from 'ofetch'

type AssignmentResponse = components['schemas']['AssignmentResponse']
type CreateAssignmentsRequest = components['schemas']['CreateAssignmentsRequest']
type UpdateAssignmentRequest = components['schemas']['UpdateAssignmentRequest']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
const lessonId = computed(() => String(route.params.id ?? ''))

const { data: assignments, pending, error, refresh } = useBackend('/api/assignments', {
  method: 'GET',
  query: computed(() => ({ lessonId: lessonId.value })),
})

// ── Create (bulk) ─────────────────────────────────────────

interface DraftItem {
  maxPoints: number
  required: boolean
}

const createItems = ref<DraftItem[]>([{ maxPoints: 10, required: true }])
const creating = ref(false)

function addCreateItem() {
  createItems.value.push({ maxPoints: 10, required: false })
}

function removeCreateItem(index: number) {
  createItems.value.splice(index, 1)
}

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

async function handleCreate() {
  if (createItems.value.length === 0)
    return

  creating.value = true
  try {
    const body: CreateAssignmentsRequest = {
      lessonId: lessonId.value,
      items: createItems.value.map(item => ({
        maxPoints: item.maxPoints,
        required: item.required,
      })),
    }
    await $backend('/api/assignments', { method: 'POST', body })
    toast.add({ title: 'Задания созданы', color: 'success', icon: 'i-lucide-check' })
    createItems.value = [{ maxPoints: 10, required: true }]
    await refresh()
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    creating.value = false
  }
}

// ── Edit ──────────────────────────────────────────────────

const editOpen = ref(false)
const editAssignment = ref<AssignmentResponse | null>(null)
const editOrder = ref<number>(1)
const editMaxPoints = ref<number>(10)
const editRequired = ref<boolean>(true)
const saving = ref(false)

function openEdit(assignment: AssignmentResponse) {
  editAssignment.value = assignment
  editOrder.value = assignment.order ?? 1
  editMaxPoints.value = assignment.maxPoints ?? 10
  editRequired.value = assignment.required ?? false
  editOpen.value = true
}

function closeEdit() {
  editOpen.value = false
  editAssignment.value = null
}

async function handleUpdate() {
  if (!editAssignment.value?.id)
    return

  saving.value = true
  try {
    const body: UpdateAssignmentRequest = {
      order: editOrder.value,
      maxPoints: editMaxPoints.value,
      required: editRequired.value,
    }
    await $backend('/api/assignments/{id}', {
      method: 'PUT',
      path: { id: editAssignment.value.id },
      body,
    })
    toast.add({ title: 'Задание обновлено', color: 'success', icon: 'i-lucide-check' })
    closeEdit()
    await refresh()
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    saving.value = false
  }
}

// ── Delete ────────────────────────────────────────────────

const deleteModal = ref(false)
const deleteTarget = ref<AssignmentResponse | null>(null)
const deleting = ref(false)

function openDelete(assignment: AssignmentResponse) {
  deleteTarget.value = assignment
  deleteModal.value = true
}

function closeDelete() {
  deleteModal.value = false
  deleteTarget.value = null
}

async function confirmDelete() {
  if (!deleteTarget.value?.id)
    return

  deleting.value = true
  try {
    await $backend('/api/assignments/{id}', {
      method: 'DELETE',
      path: { id: deleteTarget.value.id },
    })
    toast.add({ title: 'Задание удалено', color: 'success', icon: 'i-lucide-check' })
    closeDelete()
    await refresh()
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    deleting.value = false
  }
}

// ── Table ─────────────────────────────────────────────────

const columns: TableColumn<AssignmentResponse>[] = [
  {
    accessorKey: 'order',
    header: '№',
    meta: {
      class: {
        th: 'w-16 text-center',
        td: 'text-center',
      },
    },
  },
  {
    accessorKey: 'maxPoints',
    header: 'Max баллов',
    meta: {
      class: {
        th: 'w-32 text-center',
        td: 'text-center',
      },
    },
  },
  {
    accessorKey: 'required',
    header: 'Обязательное',
    meta: {
      class: {
        th: 'w-32 text-center',
        td: 'text-center',
      },
    },
  },
  {
    id: 'actions',
    meta: {
      class: {
        th: 'w-24',
        td: 'text-right',
      },
    },
  },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Задания занятия">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <!-- Empty: bulk create -->
    <UCard
      v-else-if="!pending && (assignments?.length === 0)"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-clipboard-pen" class="text-primary size-5" />
          <span class="font-medium">Создание заданий</span>
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <p class="text-muted text-sm">
          У этого занятия пока нет заданий. Создайте набор — порядковые номера присвоятся автоматически.
        </p>

        <div
          v-for="(item, index) in createItems"
          :key="index"
          class="flex items-end gap-3"
        >
          <UFormField label="Max баллов" class="w-32">
            <UInput
              v-model.number="item.maxPoints"
              type="number"
              :min="1"
            />
          </UFormField>

          <UCheckbox v-model="item.required" label="Обязательное" />

          <UButton
            v-if="createItems.length > 1"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            @click="removeCreateItem(index)"
          />
        </div>

        <div class="flex gap-2">
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            @click="addCreateItem"
          >
            Добавить задание
          </UButton>
          <UButton
            icon="i-lucide-check"
            :loading="creating"
            @click="handleCreate"
          >
            Создать
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- List -->
    <div v-else class="flex flex-col gap-4">
      <UTable
        :data="assignments ?? []"
        :columns="columns"
        :loading="pending"
        sticky
      >
        <template #required-cell="{ row }">
          <UIcon
            :name="row.original.required ? 'i-lucide-check' : 'i-lucide-minus'"
            :class="row.original.required ? 'text-success' : 'text-muted'"
            class="size-4"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              @click="openEdit(row.original)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              @click="openDelete(row.original)"
            />
          </div>
        </template>

        <template #empty>
          <UEmpty
            icon="i-lucide-clipboard-x"
            title="Нет заданий"
            description="Задания для этого занятия ещё не созданы."
            variant="naked"
            class="py-6"
          />
        </template>
      </UTable>
    </div>

    <!-- Edit modal -->
    <UModal
      :open="editOpen"
      title="Редактирование задания"
      @update:open="(v: boolean) => { if (!v && !saving) closeEdit() }"
    >
      <template #body="{ close }">
        <div class="flex flex-col gap-4">
          <UFormField label="Порядковый номер">
            <UInput
              v-model.number="editOrder"
              type="number"
              :min="1"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Max баллов">
            <UInput
              v-model.number="editMaxPoints"
              type="number"
              :min="1"
              class="w-full"
            />
          </UFormField>

          <UCheckbox v-model="editRequired" label="Обязательное" />

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="saving"
              @click="close()"
            >
              Отмена
            </UButton>
            <UButton
              icon="i-lucide-check"
              :loading="saving"
              :disabled="saving"
              @click="handleUpdate"
            >
              Сохранить
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete confirm -->
    <ConfirmModal
      :open="deleteModal"
      title="Удалить задание"
      description="Связанные оценки будут удалены каскадно. Продолжить?"
      confirm-label="Удалить"
      confirm-color="error"
      confirm-icon="i-lucide-trash-2"
      :pending="deleting"
      @close="closeDelete"
      @confirm="confirmDelete"
    />
  </div>
</template>
