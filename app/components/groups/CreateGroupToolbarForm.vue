<script setup lang="ts">
import type { CreateGroupRequestPayload, StudentGroupResponse } from '#shared/types/backend'
import { createGroupRequestSchema } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

const props = defineProps<{
  afterCreate?: () => void | Promise<void>
}>()

interface ApiErrorPayload {
  statusMessage?: string
  message?: string
}

interface ApiErrorShape {
  message?: string
  data?: ApiErrorPayload
}

const state = reactive<CreateGroupRequestPayload>({
  groupName: '',
  studentNames: [['']],
})

const pending = ref(false)

const { create } = useStudentsGroupsApi()
const toast = useToast()

function parseSubgroupStudents(value: string): string[] {
  return value
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0)
}

function formatSubgroupStudents(value: string[]): string {
  return value.join('\n')
}

function updateSubgroupStudents(index: number, value: string) {
  state.studentNames[index] = parseSubgroupStudents(value)
}

function addSubgroup() {
  state.studentNames.push([''])
}

function removeSubgroup(index: number) {
  if (state.studentNames.length <= 1) {
    return
  }

  state.studentNames.splice(index, 1)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  const apiError = error as ApiErrorShape
  return apiError.data?.statusMessage || apiError.data?.message || apiError.message || 'Failed to create group'
}

function resetForm() {
  state.groupName = ''
  state.studentNames = [['']]
}

function onAfterLeave() {
  if (!pending.value) {
    resetForm()
  }
}

async function onSubmit(event: { data: CreateGroupRequestPayload }, close: () => void) {
  if (pending.value) {
    return
  }

  const payload: CreateGroupRequestPayload = event.data

  pending.value = true

  try {
    const {
      data,
      error,
    } = await create(payload)

    if (error.value || !data.value) {
      throw error.value || new Error('Group was not returned by API')
    }

    const createdGroup: StudentGroupResponse = data.value

    toast.add({
      title: 'Group created',
      description: `"${createdGroup.name}" is ready.`,
      color: 'success',
      icon: 'i-lucide-check',
    })

    close()
    resetForm()

    if (props.afterCreate) {
      await props.afterCreate()
    }
  }
  catch (error: unknown) {
    toast.add({
      title: 'Create failed',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    title="Create group"
    description="Enter group and subgroup students, then submit."
    @after:leave="onAfterLeave"
  >
    <UButton
      icon="i-lucide-plus"
      color="primary"
    >
      Create group
    </UButton>

    <template #body="{ close }">
      <UForm
        :schema="createGroupRequestSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit($event, close)"
      >
        <UFormField
          name="groupName"
          label="Group"
          required
        >
          <UInput
            v-model="state.groupName"
            placeholder="e.g. Grade 10"
            :disabled="pending"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="studentNames"
          label="Subgroups"
          required
        >
          <div class="space-y-3">
            <div
              v-for="(subgroupStudents, index) in state.studentNames"
              :key="index"
              class="space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-default">
                  Subgroup {{ index + 1 }}
                </p>

                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-trash-2"
                  :disabled="pending || state.studentNames.length <= 1"
                  @click="removeSubgroup(index)"
                >
                  Remove
                </UButton>
              </div>

              <UFormField
                :name="`studentNames.${index}`"
              >
                <UTextarea
                  :model-value="formatSubgroupStudents(subgroupStudents)"
                  :rows="4"
                  :disabled="pending"
                  placeholder="Alice\nBob"
                  class="w-full"
                  @update:model-value="updateSubgroupStudents(index, String($event ?? ''))"
                />
              </UFormField>
            </div>

            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-plus"
              :disabled="pending"
              @click="addSubgroup"
            >
              Add subgroup
            </UButton>
          </div>
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="soft"
            :disabled="pending"
            @click="close()"
          >
            Cancel
          </UButton>

          <UButton
            type="submit"
            icon="i-lucide-check"
            :loading="pending"
            :disabled="pending"
          >
            Create
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
