<script setup lang="ts">
import type { PageCardProps } from '@nuxt/ui'

definePageMeta({ middleware: 'subject-permission' })

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const cards = computed<PageCardProps[]>(() => [
  {
    to: `/dashboard/subjects/${subjectId.value}/settings/permissions`,
    title: 'Назначения преподавателей',
    description: 'Управление доступами преподавателей к предмету',
    icon: 'i-lucide-shield-check',
  },
  {
    to: `/dashboard/subjects/${subjectId.value}/settings/penalty-policy`,
    title: 'Политика понижения балла за просрочку',
    description: 'Настройка правил начисления штрафов за просроченные задания',
    icon: 'i-lucide-gavel',
  },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Настройки предмета" />

    <UPageGrid>
      <UPageCard
        v-for="card in cards"
        :key="card.to as string"
        v-bind="card"
      />
    </UPageGrid>
  </div>
</template>
