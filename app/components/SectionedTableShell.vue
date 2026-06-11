<script setup lang="ts" generic="T extends { username?: string | null }">
import type { TableColumn } from '@nuxt/ui'
import { computed, ref } from 'vue'

interface ShellSection {
  key: string
  label: string
  students: T[]
  // NoInfer: тип строки берём из students, чтобы контравариантный TableColumn его не «расширял».
  columns: TableColumn<NoInfer<T>>[]
  /** Доп. счётчики (используются, напр., в посещаемости). */
  filledCells?: number
  totalCells?: number
}

const props = withDefaults(defineProps<{
  sections: ShellSection[]
  pending?: boolean
  isEmpty?: boolean
  hasAnyLessons?: boolean
  emptyDescription?: string
  tableMaxHeight?: string
  ui?: Record<string, string>
  /** Обработчик навигации по ячейкам (capture-фаза keydown). */
  cellKeydown?: (e: KeyboardEvent) => void
}>(), {
  pending: false,
  isEmpty: false,
  hasAnyLessons: false,
  emptyDescription: 'Нет данных.',
  tableMaxHeight: 'calc(100vh - 18rem)',
})

defineSlots<{
  'legend'?: () => unknown
  'section-extra'?: (props: { section: ShellSection }) => unknown
  'username-cell'?: (props: { row: { original: T } }) => unknown
  'after'?: () => unknown
}>()

const fullscreenKey = ref<string | null>(null)
const fullscreenSection = computed(() => props.sections.find(s => s.key === fullscreenKey.value) ?? null)

// Ссылка на создание занятий для пустого состояния (страницы оценок/посещаемости
// живут под subjects/[uuid]). Кнопку показываем только при полном доступе.
const route = useRoute()
const { hasAllPermissions } = usePermissions()
const createLessonsTo = computed(() => {
  const uuid = String(route.params.uuid ?? '')
  return uuid ? `/dashboard/subjects/${uuid}/lessons/create` : ''
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <slot name="legend" />

    <!-- Empty state -->
    <UEmpty
      v-if="!pending && isEmpty"
      icon="i-lucide-clipboard-x"
      title="Нет данных"
      :description="emptyDescription"
      variant="naked"
      class="py-6"
    >
      <template v-if="hasAllPermissions && createLessonsTo" #actions>
        <UButton
          icon="i-lucide-plus"
          label="Создать занятия"
          color="primary"
          :to="createLessonsTo"
        />
      </template>
    </UEmpty>

    <!-- Sections -->
    <template v-else>
      <section
        v-for="section in sections"
        :key="section.key"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-default">
            {{ section.label }}
          </h3>
          <slot name="section-extra" :section="section" />
          <UButton
            v-if="section.columns.length > 1"
            icon="i-lucide-maximize-2"
            color="neutral"
            variant="ghost"
            title="На весь экран"
            class="ml-auto"
            @click="fullscreenKey = section.key"
          />
        </div>

        <UAlert
          v-if="section.columns.length <= 1"
          color="neutral"
          variant="soft"
          icon="i-lucide-info"
          :title="hasAnyLessons ? 'Нет занятий по выбранному фильтру' : 'Для этой группы пока нет занятий'"
        />

        <UTable
          v-else
          :data="section.students"
          :columns="section.columns"
          :loading="pending && section.students.length === 0"
          loading-color="primary"
          loading-animation="carousel"
          sticky
          :style="{ maxHeight: tableMaxHeight }"
          class="rounded-lg border border-default"
          :ui="ui"
          @keydown.capture="cellKeydown?.($event)"
        >
          <template #username-cell="{ row }">
            <slot name="username-cell" :row="row">
              <span
                :title="(row.original as T).username ?? ''"
                class="line-clamp-1 font-medium text-highlighted"
              >
                {{ (row.original as T).username ?? '—' }}
              </span>
            </slot>
          </template>
        </UTable>
      </section>
    </template>

    <UModal
      :open="fullscreenSection !== null"
      fullscreen
      :title="fullscreenSection?.label ?? ''"
      @update:open="(v) => { if (!v) fullscreenKey = null }"
    >
      <template #body>
        <UTable
          v-if="fullscreenSection"
          :data="fullscreenSection.students"
          :columns="fullscreenSection.columns"
          :loading="pending && fullscreenSection.students.length === 0"
          loading-color="primary"
          loading-animation="carousel"
          sticky
          style="max-height: calc(100vh - 8rem)"
          class="rounded-lg border border-default"
          :ui="ui"
          @keydown.capture="cellKeydown?.($event)"
        >
          <template #username-cell="{ row }">
            <slot name="username-cell" :row="row">
              <span
                :title="(row.original as T).username ?? ''"
                class="line-clamp-1 font-medium text-highlighted"
              >
                {{ (row.original as T).username ?? '—' }}
              </span>
            </slot>
          </template>
        </UTable>
      </template>
    </UModal>

    <slot name="after" />
  </div>
</template>
