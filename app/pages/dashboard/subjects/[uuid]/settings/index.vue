<script setup lang="ts">
const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Настройки предмета" />

    <UPageGrid>
      <UPageCard
        :to="`/dashboard/subjects/${subjectId}/settings/permissions`"
        title="Назначения преподавателей"
        description="Управление доступами преподавателей к предмету"
        icon="i-lucide-shield-check"
      />
    </UPageGrid>
  </div>
</template>
