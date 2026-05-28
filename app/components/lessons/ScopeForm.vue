<script setup lang="ts">
import type { LessonScopeFormState } from '~/composables/useLessonScopeForm'

const props = defineProps<{
  state: LessonScopeFormState
  loading?: boolean
}>()

const form = props.state
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Mode toggle -->
    <UFormField label="Аудитория">
      <URadioGroup
        v-model="form.mode"
        :items="[
          { value: 'all', label: 'Все группы предмета' },
          { value: 'groups', label: 'Выбранные группы' },
        ]"
      />
    </UFormField>

    <!-- All groups: single date -->
    <template v-if="form.mode === 'all'">
      <UFormField label="Дата проведения" required>
        <UInput
          v-model="form.allGroupsDate"
          type="date"
          class="w-full"
        />
      </UFormField>
    </template>

    <!-- Per-group: full coverage required -->
    <template v-else>
      <div v-if="loading && form.groupEntries.length === 0" class="flex flex-col gap-3">
        <USkeleton v-for="i in 3" :key="i" class="h-24" />
      </div>

      <UEmpty
        v-else-if="!loading && form.groupEntries.length === 0"
        icon="i-lucide-users"
        title="Нет групп"
        description="К этому предмету не привязаны группы"
        variant="naked"
        class="py-4"
      />

      <UCard
        v-for="entry in form.groupEntries"
        :key="entry.groupId"
        :ui="{ body: 'p-4' }"
      >
        <div class="flex flex-col gap-3">
          <!-- Group header -->
          <div class="font-medium">
            {{ entry.groupName }}
          </div>

          <!-- Split toggle (only if group has subgroups) -->
          <UCheckbox
            v-if="entry.subgroups.length > 0"
            v-model="entry.splitBySubgroups"
            label="Разбить по подгруппам (у каждой своя дата)"
          />

          <!-- Whole-group date -->
          <template v-if="!entry.splitBySubgroups">
            <UFormField label="Дата" required>
              <UInput
                v-model="entry.date"
                type="date"
                class="w-full"
              />
            </UFormField>
          </template>

          <!-- Per-subgroup dates -->
          <template v-else>
            <div
              v-for="sub in entry.subgroupEntries"
              :key="sub.subgroupId"
              class="flex items-center gap-3"
            >
              <span class="w-32 shrink-0 text-sm text-muted">
                Подгруппа {{ sub.index }}
              </span>
              <UInput
                v-model="sub.date"
                type="date"
                class="flex-1"
              />
            </div>
          </template>
        </div>
      </UCard>
    </template>
  </div>
</template>
