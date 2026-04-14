<script setup lang="ts">
import type { CreateGroupRequest, StudentGroupResponse } from '#shared/types/backend'
import { z } from 'zod'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

const props = defineProps<{
  afterCreate?: () => void | Promise<void>
}>()

const createGroupSchema = z.object({
  groupName: z
    .string()
    .trim()
    .min(1, 'Group name is required')
    .max(120, 'Group name must be 120 characters or less'),
  subgroupInputs: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Add at least one student to subgroup')
        .refine(value => parseSubgroupStudents(value).length > 0, {
          message: 'Add at least one student to subgroup'
        })
    )
    .min(1, 'Add at least one subgroup')
})

type CreateGroupFormData = z.output<typeof createGroupSchema>
type ApiErrorPayload = {
  statusMessage?: string
  message?: string
}

type ApiErrorShape = {
  message?: string
  data?: ApiErrorPayload
}

const state = reactive<CreateGroupFormData>({
  groupName: '',
  subgroupInputs: ['']
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

function parseStudentNamesMatrix(subgroupInputs: string[]): string[][] {
  return subgroupInputs
    .map(parseSubgroupStudents)
    .filter(subgroup => subgroup.length > 0)
}

function addSubgroup() {
  state.subgroupInputs.push('')
}

function removeSubgroup(index: number) {
  if (state.subgroupInputs.length <= 1) {
    return
  }

  state.subgroupInputs.splice(index, 1)
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
  state.subgroupInputs = ['']
}

function onAfterLeave() {
  if (!pending.value) {
    resetForm()
  }
}

async function onSubmit(event: { data: CreateGroupFormData }, close: () => void) {
  if (pending.value) {
    return
  }

  const studentNames = parseStudentNamesMatrix(event.data.subgroupInputs)

  if (studentNames.length === 0) {
    toast.add({
      title: 'Cannot create group',
      description: 'Add at least one subgroup and one student name.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  const payload: CreateGroupRequest = {
    groupName: event.data.groupName.trim(),
    studentNames
  }

  pending.value = true

  try {
    const response = await create(payload)

    if (response.error.value || !response.data.value) {
      throw response.error.value || new Error('Group was not returned by API')
    }

    const createdGroup: StudentGroupResponse = response.data.value

    toast.add({
      title: 'Group created',
      description: `"${createdGroup.name}" is ready.`,
      color: 'success',
      icon: 'i-lucide-check'
    })

    close()
    resetForm()

    if (props.afterCreate) {
      await props.afterCreate()
    }
  } catch (error: unknown) {
    toast.add({
      title: 'Create failed',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
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
        :schema="createGroupSchema"
        :state="state"
        class="space-y-4"
        @submit="(event) => onSubmit(event, close)"
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
          name="subgroupInputs"
          label="Subgroups"
          required
        >
          <div class="space-y-3">
            <div
              v-for="(subgroupInput, index) in state.subgroupInputs"
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
                  :disabled="pending || state.subgroupInputs.length <= 1"
                  @click="removeSubgroup(index)"
                >
                  Remove
                </UButton>
              </div>

              <UFormField
                :name="`subgroupInputs.${index}`"
              >
                <UTextarea
                  v-model="state.subgroupInputs[index]"
                  :rows="4"
                  :disabled="pending"
                  placeholder="Alice\nBob"
                  class="w-full"
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
