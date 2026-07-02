<script setup lang="ts">
// Дефолтный раздел настроек — «Назначения преподавателей». Отдельного экрана-
// обзора больше нет: его роль выполняет постоянная боковая навигация в settings.vue.
definePageMeta({ middleware: 'subject-permission' })

const route = useRoute()

await navigateTo(
  `/dashboard/subjects/${route.params.uuid}/settings/permissions`,
  { replace: true },
)
</script>

<template>
  <div />
</template>
