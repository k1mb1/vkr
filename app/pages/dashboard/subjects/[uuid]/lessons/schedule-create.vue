<script setup lang="ts">
import type { BulkScheduleRequest } from '~/composables/useBulkScheduleForm'
import { bulkSchedule, getGroupsBySubject } from '#hey-api'
import {
  buildBulkScheduleItems,
  bulkScheduleBody,
  generateScheduleDates,
  initBulkScheduleGroups,
  initialBulkScheduleState,
  validateBulkSchedule,
} from '~/composables/useBulkScheduleForm'

definePageMeta({ middleware: 'subject-permission' })

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const toast = useToast()
const { permission } = usePermissions()
const { loading, submit } = useFormSubmit()

// Тип занятия и число проведений — общие; аудитории и их расписания — в форме.
const lessonType = ref<BulkScheduleRequest['lessonType']>('PRACTICE')
const count = ref(1)
const form = reactive(initialBulkScheduleState())

const { data: groups, pending: groupsPending } = useApi(
  { key: `groups-by-subject:${subjectId}` },
  () => getGroupsBySubject({ query: { subjectId } }),
)

watch(groups, (val) => {
  if (val)
    initBulkScheduleGroups(form, val)
}, { immediate: true })

const items = computed(() => buildBulkScheduleItems(form))
const errors = computed(() => validateBulkSchedule(form, count.value))
const totalScopes = computed(() => items.value.reduce(
  (sum, it) => sum + generateScheduleDates(it.firstLessonDate, count.value, it.days).length,
  0,
))
const canSubmit = computed(() => errors.value.length === 0 && totalScopes.value > 0)

async function handleCreate() {
  if (errors.value.length) {
    toast.add({
      title: 'Исправьте ошибки',
      description: errors.value.join(' · '),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
    return
  }

  const body: BulkScheduleRequest = {
    subjectId,
    lessonType: lessonType.value,
    count: count.value,
    items: items.value,
  }

  await submit(
    () => bulkSchedule({ body: bulkScheduleBody(body) }),
    {
      successMessage: (result) => {
        const lessons = result.length
        const scopes = result.reduce((n, l) => n + (l.scopes?.length ?? 0), 0) || totalScopes.value
        return `Создано занятий: ${lessons} (проведений: ${scopes})`
      },
      onSuccess: () => navigateTo(`/dashboard/subjects/${subjectId}/lessons`),
    },
  )
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Создать занятие по расписанию">
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
      v-if="!permission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <UAlert
      v-else-if="!permission.allPermissions"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Недостаточно прав"
      description="Создавать занятия могут только преподаватели с доступом ко всем группам предмета."
    />

    <template v-else>
      <UAlert
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="Создание занятий по расписанию"
        description="Создаётся серия из указанного числа занятий: занятие k проходит на k-ю дату каждой аудитории. Укажите тип и число занятий, затем выберите аудиторию: «Все группы» — общее расписание, «Выбранные группы» — у каждой группы (и при разбивке у каждой подгруппы) своя дата первой пары и свой недельный шаблон. Для каждой аудитории создаётся ровно указанное число проведений. Несколько недель в шаблоне нужны для чередования (например, раз в две недели: дни в 1-й неделе, пустая 2-я)."
      />

      <div class="flex flex-col gap-4">
        <UFormField label="Тип занятия" required>
          <URadioGroup
            v-model="lessonType"
            orientation="horizontal"
            :items="[
              { value: 'LECTURE', label: 'Лекция' },
              { value: 'PRACTICE', label: 'Практика' },
            ]"
          />
        </UFormField>

        <UFormField label="Количество занятий" required>
          <UInput v-model.number="count" type="number" :min="1" class="w-40" />
        </UFormField>

        <!-- Аудитория -->
        <UFormField label="Аудитория">
          <URadioGroup
            v-model="form.mode"
            orientation="horizontal"
            :items="[
              { value: 'all', label: 'Все группы предмета' },
              { value: 'groups', label: 'Выбранные группы' },
            ]"
          />
        </UFormField>

        <!-- Все группы: одно общее расписание -->
        <template v-if="form.mode === 'all'">
          <LessonsScheduleEntryFields :schedule="form.allGroupsSchedule" :count="count" />
        </template>

        <!-- По группам: своё расписание у каждой группы/подгруппы -->
        <template v-else>
          <div v-if="groupsPending && form.groupEntries.length === 0" class="flex flex-col gap-3">
            <USkeleton v-for="i in 3" :key="i" class="h-40" />
          </div>

          <UEmpty
            v-else-if="!groupsPending && form.groupEntries.length === 0"
            icon="i-lucide-users"
            title="Нет групп"
            description="К этому предмету не привязаны группы"
            variant="naked"
            class="py-4"
          />

          <div v-else class="flex flex-col gap-3">
            <UCard
              v-for="entry in form.groupEntries"
              :key="entry.groupId"
              :ui="{ body: 'flex flex-col gap-4 p-4' }"
            >
              <div class="flex flex-col gap-1">
                <div class="font-medium">
                  {{ entry.groupName }}
                </div>
                <UCheckbox
                  v-if="entry.subgroups.length > 0"
                  v-model="entry.splitBySubgroups"
                  label="Разбить по подгруппам (у каждой своё расписание)"
                />
              </div>

              <!-- Одно расписание на всю группу -->
              <template v-if="!entry.splitBySubgroups">
                <LessonsScheduleEntryFields :schedule="entry.schedule" :count="count" />
              </template>

              <!-- Расписание по подгруппам -->
              <template v-else>
                <div
                  v-for="sub in entry.subgroupSchedules"
                  :key="sub.subgroupId"
                  class="flex flex-col gap-3 rounded-lg border border-default bg-elevated/30 p-3"
                >
                  <UBadge
                    :label="`Подгруппа ${sub.index}`"
                    color="neutral"
                    variant="subtle"
                    class="self-start font-medium"
                  />
                  <LessonsScheduleEntryFields :schedule="sub.schedule" :count="count" />
                </div>
              </template>
            </UCard>
          </div>
        </template>

        <UButton
          icon="i-lucide-check"
          :loading="loading"
          :disabled="!canSubmit"
          class="ml-auto"
          @click="handleCreate"
        >
          Создать занятия<template v-if="count > 0">
            ({{ count }} зан. · {{ totalScopes }} провед.)
          </template>
        </UButton>
      </div>
    </template>
  </div>
</template>
