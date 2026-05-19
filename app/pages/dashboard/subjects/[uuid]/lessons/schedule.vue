<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { FetchError } from 'ofetch'

type BulkScheduleRequest = components['schemas']['BulkScheduleRequest']
type LessonScopeRequest = components['schemas']['LessonScopeRequest']
type LessonType = 'LECTURE' | 'PRACTICE'
type shedules = BulkScheduleRequest['schedules'][number]
type DayOfWeek = shedules['daysOfWeek'][number][number]

const DAYS: { value: DayOfWeek, label: string }[] = [
  { value: 'MONDAY', label: 'Пн' },
  { value: 'TUESDAY', label: 'Вт' },
  { value: 'WEDNESDAY', label: 'Ср' },
  { value: 'THURSDAY', label: 'Чт' },
  { value: 'FRIDAY', label: 'Пт' },
  { value: 'SATURDAY', label: 'Сб' },
  { value: 'SUNDAY', label: 'Вс' },
]

interface ScopeState {
  groupId: string
  allowedSubgroupId: string | null
}

interface EntryState {
  type: LessonType
  startDate: string
  totalCount: number
  daysOfWeek: DayOfWeek[][]
}

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

const { permission, scopes: myScopes, pending: loadingScope } = usePermissions()

const teacherAllGroups = computed(() => permission.value?.allPermissions ?? false)
const allGroups = ref(teacherAllGroups.value)

function myScopeForGroup(groupId: string) {
  return myScopes.value.find(s => s.group?.id === groupId)
}

const scopeState = reactive<ScopeState>({
  groupId: '',
  allowedSubgroupId: null,
})

watch(() => scopeState.groupId, (gid, oldGid) => {
  if (gid !== oldGid)
    scopeState.allowedSubgroupId = null
})

const allowedLessonTypeOptions = computed<{ value: LessonType, label: string }[]>(() => {
  const restricted = myScopeForGroup(scopeState.groupId)?.allowedLessonType as LessonType | null | undefined
  if (restricted)
    return [{ value: restricted, label: restricted === 'LECTURE' ? 'Лекция' : 'Практика' }]
  return [
    { value: 'LECTURE', label: 'Лекция' },
    { value: 'PRACTICE', label: 'Практика' },
  ]
})

function makeEntry(defaultType: LessonType = 'LECTURE'): EntryState {
  return { type: defaultType, startDate: '', totalCount: 1, daysOfWeek: [[]] }
}

const schedules = ref<EntryState[]>([makeEntry()])

watch(allowedLessonTypeOptions, (opts) => {
  const allowed = new Set(opts.map(o => o.value))
  for (const entry of schedules.value) {
    if (!allowed.has(entry.type) && opts.length > 0)
      entry.type = opts[0]!.value
  }
})

function addEntry() {
  const firstAllowed = allowedLessonTypeOptions.value[0]?.value ?? 'LECTURE'
  schedules.value.push(makeEntry(firstAllowed))
}

function removeEntry(i: number) {
  schedules.value.splice(i, 1)
}

function addWeek(entry: EntryState) {
  entry.daysOfWeek.push([])
}

function removeWeek(entry: EntryState, wi: number) {
  entry.daysOfWeek.splice(wi, 1)
}

function toggleDay(entry: EntryState, wi: number, day: DayOfWeek) {
  const week = entry.daysOfWeek[wi]
  if (!week)
    return
  const idx = week.indexOf(day)
  if (idx >= 0)
    week.splice(idx, 1)
  else
    week.push(day)
}

function isDaySelected(entry: EntryState, wi: number, day: DayOfWeek): boolean {
  return entry.daysOfWeek[wi]?.includes(day) ?? false
}

const loading = ref(false)

const errors = ref<string[]>([])

function validate(): boolean {
  errors.value = []
  if (!allGroups.value && !scopeState.groupId)
    errors.value.push('Выберите группу')
  for (const [i, entry] of schedules.value.entries()) {
    if (!entry.startDate)
      errors.value.push(`Занятие ${i + 1}: введите дату начала`)
    if (entry.totalCount < 1)
      errors.value.push(`Занятие ${i + 1}: количество минимум 1`)
    for (const [wi, week] of entry.daysOfWeek.entries()) {
      if (week.length === 0)
        errors.value.push(`Занятие ${i + 1}, неделя ${wi + 1}: выберите хотя бы один день`)
    }
  }
  return errors.value.length === 0
}

async function handleCreate() {
  if (!validate())
    return

  loading.value = true
  try {
    const body: BulkScheduleRequest = {
      subjectId,
      allGroups: allGroups.value,
      scopes: allGroups.value
        ? undefined
        : [{
            groupId: scopeState.groupId,
            allowedSubgroupId: scopeState.allowedSubgroupId ?? undefined,
          }] as LessonScopeRequest[],
      schedules: schedules.value,
    }
    const result = await $backend('/api/lessons/bulk-schedule', { method: 'POST', body })
    toast.add({
      title: `Создано занятий: ${result.length}`,
      color: 'success',
      icon: 'i-lucide-check',
    })
    await navigateTo(`/dashboard/subjects/${subjectId}/lessons`)
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Создать занятия по расписанию">
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
      v-if="!loadingScope && !permission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <div v-else-if="loadingScope" class="flex flex-col gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-12" />
    </div>

    <div v-else class="flex flex-col gap-4">
      <UCheckbox v-if="teacherAllGroups" v-model="allGroups" label="Все группы предмета" />

      <template v-if="!allGroups">
        <UFormField label="Группа" required>
          <GroupsPermissionScopeSelect v-model="scopeState.groupId" />
        </UFormField>

        <UFormField v-if="scopeState.groupId" label="Подгруппа">
          <SubgroupsSelect
            v-model="scopeState.allowedSubgroupId"
            :group-id="scopeState.groupId"
            :allowed-subgroup-id="myScopeForGroup(scopeState.groupId)?.allowedSubgroup?.id"
          />
        </UFormField>
      </template>

      <USeparator />

      <UAlert
        v-if="errors.length"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Исправьте ошибки"
        :description="errors.join(' · ')"
      />

      <div class="flex flex-col gap-6">
        <UCard
          v-for="(entry, i) in schedules"
          :key="i"
          :ui="{ body: 'flex flex-col gap-4' }"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">Занятие {{ i + 1 }}</span>
              <UButton
                v-if="schedules.length > 1"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                @click="removeEntry(i)"
              />
            </div>
          </template>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UFormField label="Тип занятия" required>
              <USelect
                v-model="entry.type"
                :items="allowedLessonTypeOptions"
                :disabled="allowedLessonTypeOptions.length <= 1"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Дата начала" required>
              <UInput
                v-model="entry.startDate"
                type="date"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Всего занятий" required>
              <UInput
                v-model.number="entry.totalCount"
                type="number"
                :min="1"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">
              Шаблон расписания
            </p>
            <p class="text-muted text-xs">
              Дни повторяются циклически по неделям до достижения нужного количества
            </p>

            <div
              v-for="(_, wi) in entry.daysOfWeek"
              :key="wi"
              class="flex items-center gap-2"
            >
              <span class="text-muted w-20 shrink-0 text-sm">Неделя {{ wi + 1 }}</span>
              <div class="flex flex-1 flex-wrap gap-1">
                <UButton
                  v-for="day in DAYS"
                  :key="day.value"
                  :label="day.label"
                  :variant="isDaySelected(entry, wi, day.value) ? 'solid' : 'outline'"
                  :color="isDaySelected(entry, wi, day.value) ? 'primary' : 'neutral'"
                  class="w-10"
                  @click="toggleDay(entry, wi, day.value)"
                />
              </div>
              <UButton
                v-if="entry.daysOfWeek.length > 1"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                @click="removeWeek(entry, wi)"
              />
            </div>

            <UButton
              icon="i-lucide-plus"
              label="Добавить неделю"
              color="neutral"
              variant="ghost"
              class="self-start"
              @click="addWeek(entry)"
            />
          </div>
        </UCard>
      </div>

      <UButton
        icon="i-lucide-plus"
        label="Добавить занятие"
        color="neutral"
        variant="outline"
        class="self-start"
        :disabled="allowedLessonTypeOptions.length === 0"
        @click="addEntry"
      />

      <UButton
        icon="i-lucide-check"
        :loading="loading"
        :disabled="(!allGroups && !scopeState.groupId) || allowedLessonTypeOptions.length === 0"
        class="ml-auto"
        @click="handleCreate"
      >
        Создать занятия
      </UButton>
    </div>
  </div>
</template>
