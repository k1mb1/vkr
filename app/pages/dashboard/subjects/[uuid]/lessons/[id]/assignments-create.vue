<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import * as v from 'valibot'
import { arrayMinLength } from '~/utils/validation'

definePageMeta({ middleware: 'subject-permission' })

type LessonResponse = components['schemas']['LessonResponse']
type CreateAssignmentsRequest = components['schemas']['CreateAssignmentsRequest']
type CreateAssignmentsForm = Omit<CreateAssignmentsRequest, 'items'> & {
  items: Pick<CreateAssignmentsRequest['items'][number], 'maxPoints' | 'required'>[]
}

const CreateAssignmentsSchema: SchemaFor<CreateAssignmentsForm> = v.object({
  lessonId: v.string(),
  items: arrayMinLength(
    v.object({
      maxPoints: v.pipe(
        v.union(
          [v.number(), v.pipe(v.string(), v.transform(Number))],
          'Введите число',
        ),
        v.number('Введите число'),
        v.integer('Только целое число'),
        v.minValue(1, 'Минимум 1 балл'),
      ),
      required: v.boolean(),
    }),
    1,
    'Добавьте хотя бы одно задание',
  ),
})

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')
const lessonId = String(route.params.id ?? '')

const targetLesson = (history.state?.lesson ?? null) as LessonResponse | null

const { $backend } = useNuxtApp()

const { state, formRef, loading, onSubmit, onError } = useResourceForm<typeof CreateAssignmentsSchema>({
  initialState: () => ({
    lessonId,
    items: [{ maxPoints: 10, required: true }],
  }),
})

function addItem() {
  state.items.push({ maxPoints: 10, required: true })
}

function removeItem(idx: number) {
  state.items.splice(idx, 1)
}

const totalMaxPoints = computed(() =>
  state.items.reduce((sum, it) => sum + (Number(it.maxPoints) || 0), 0),
)

const handleCreate = onSubmit(
  data => $backend('/api/assignments', {
    method: 'POST',
    // Item type requires id/order, but backend assigns them on creation.
    body: data as CreateAssignmentsRequest,
  }),
  {
    successMessage: result => (result?.length ?? 0) > 1
      ? `Создано заданий: ${result!.length}`
      : 'Задание создано',
    onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/lessons`),
  },
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <UPageHeader
      title="Добавить задания"
      :description="targetLesson?.topic
        ? `Занятие: ${targetLesson.topic}`
        : 'Задания создаются один раз, порядок — в соответствии со списком ниже.'"
    >
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

    <UForm
      ref="formRef"
      :schema="CreateAssignmentsSchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="handleCreate"
      @error="onError"
    >
      <UFormField name="items" />

      <div class="flex flex-col gap-2">
        <UCard
          v-for="(item, idx) in state.items"
          :key="idx"
          :ui="{ body: 'p-3' }"
        >
          <div class="flex items-start gap-3">
            <span class="mt-2 w-8 shrink-0 text-sm font-medium text-muted">
              №{{ idx + 1 }}
            </span>

            <UFormField
              label="Макс. баллов"
              :name="`items.${idx}.maxPoints`"
              required
              class="w-40"
            >
              <UInput
                v-model.number="item.maxPoints"
                type="number"
                :min="1"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Обязательное"
              :name="`items.${idx}.required`"
              class="flex-1"
            >
              <UCheckbox v-model="item.required" label="Да" />
            </UFormField>

            <UButton
              class="mt-6"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              :disabled="state.items.length <= 1"
              :aria-label="`Удалить задание №${idx + 1}`"
              @click="removeItem(idx)"
            />
          </div>
        </UCard>

        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          class="self-start"
          @click="addItem"
        >
          Добавить задание
        </UButton>
      </div>

      <div class="flex items-center justify-between gap-2">
        <span class="text-sm text-muted">
          Заданий: {{ state.items.length }} · Сумма баллов: {{ totalMaxPoints }}
        </span>
        <div class="flex gap-2">
          <UButton
            :to="`/dashboard/subjects/${subjectId}/lessons`"
            color="neutral"
            variant="ghost"
            type="button"
          >
            Отмена
          </UButton>
          <UButton type="submit" icon="i-lucide-check" :loading="loading">
            Создать
          </UButton>
        </div>
      </div>
    </UForm>
  </div>
</template>
