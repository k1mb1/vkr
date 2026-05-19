<script setup lang="ts">
const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, scopes, pending, error } = usePermissions()
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Обзор предмета">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/permissions`"
          icon="i-lucide-shield-check"
          color="neutral"
          variant="outline"
          label="Назначения"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
          icon="i-lucide-calendar"
          color="neutral"
          variant="outline"
          label="Занятия"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/check-ins`"
          icon="i-lucide-clipboard-list"
          color="neutral"
          variant="outline"
          label="Check-in"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/attendances`"
          icon="i-lucide-clipboard-check"
          label="Посещаемость"
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

    <USkeleton v-else-if="pending" class="h-20" />

    <UEmpty
      v-else-if="!permission"
      icon="i-lucide-shield-off"
      title="Назначения нет"
      description="У вас нет назначения по данному предмету."
      variant="naked"
      class="py-8"
    />

    <div v-else class="flex flex-col gap-3">
      <UCard
        v-for="s in scopes"
        :key="s.id"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-users" class="text-primary size-5" />
            <span class="font-medium">{{ s.group?.name ?? '—' }}</span>
          </div>
        </template>
        <div class="flex flex-wrap gap-2">
          <UBadge
            variant="soft"
            color="neutral"
            :label="s.allowedSubgroup?.index != null ? `Подгруппа ${s.allowedSubgroup.index}` : 'Все подгруппы'"
            icon="i-lucide-layers"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
