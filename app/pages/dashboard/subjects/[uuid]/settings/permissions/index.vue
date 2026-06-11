<script setup lang="ts">
definePageMeta({ middleware: 'subject-permission' })

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { data, pending, error, refresh } = useBackend('/api/teacher-subject-permissions', {
  method: 'GET',
  query: { subjectId: subjectId.value },
})

const { hasAllPermissions, permissionId } = usePermissions()
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Разрешения по предмету">
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
            icon="i-lucide-user-plus"
            label="Назначить"
            :to="`/dashboard/subjects/${subjectId}/settings/permissions/create`"
          />
        </SubjectPermissionGate>
      </template>
    </UPageHeader>

    <UAlert
      color="neutral"
      variant="soft"
      icon="i-lucide-info"
      title="Что такое назначения"
      description="Назначения определяют, кто из преподавателей работает с предметом и с какими группами. Доступ ко всем группам — полные права, включая настройки предмета и выдачу назначений другим. Ограниченный доступ открывает только выбранные группы (по желанию — конкретные подгруппы и типы занятий)."
    />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <PermissionsTable
      v-else
      :data="data ?? []"
      :loading="pending"
      :can-manage="hasAllPermissions"
      :current-permission-id="permissionId"
      :subject-id="subjectId"
      @deleted="refresh()"
    />
  </div>
</template>
