<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'

type LessonResponse = components['schemas']['LessonResponse']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permissionId, pending: permissionPending } = usePermissions()

const { data, pending: lessonsPending, error, refresh } = useBackend('/api/lessons', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (pid) => {
  if (pid)
    refresh()
}, { immediate: true })

const pending = computed(() => permissionPending.value || lessonsPending.value)

const sortedData = computed<LessonResponse[]>(() =>
  [...(data.value ?? [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
)

const lectures = computed(() => sortedData.value.filter(l => l.type === 'LECTURE'))
const practices = computed(() => sortedData.value.filter(l => l.type === 'PRACTICE'))

const activeTab = ref('all')

const tabs = computed(() => [
  { label: 'Все', value: 'all', badge: sortedData.value.length || undefined },
  { label: 'Лекции', value: 'lectures', badge: lectures.value.length || undefined },
  { label: 'Практики', value: 'practices', badge: practices.value.length || undefined },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Занятия">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
        />
        <SubjectPermissionGate>
          <UButton
            icon="i-lucide-list-plus"
            label="По количеству"
            color="neutral"
            variant="outline"
            :to="`/dashboard/subjects/${subjectId}/lessons/create`"
          />
        </SubjectPermissionGate>
      </template>
    </UPageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <ClientOnly v-else>
      <UTabs v-model="activeTab" :items="tabs">
        <template #content>
          <LessonsTable
            v-if="activeTab === 'all'"
            :data="sortedData"
            :loading="pending"
            :show-type="true"
            :subject-id="subjectId"
            @refresh="refresh()"
          />
          <LessonsTable
            v-else-if="activeTab === 'lectures'"
            :data="lectures"
            :loading="pending"
            :show-type="false"
            :subject-id="subjectId"
            @refresh="refresh()"
          />
          <LessonsTable
            v-else-if="activeTab === 'practices'"
            :data="practices"
            :loading="pending"
            :show-type="false"
            :subject-id="subjectId"
            @refresh="refresh()"
          />
        </template>
      </UTabs>
    </ClientOnly>
  </div>
</template>
