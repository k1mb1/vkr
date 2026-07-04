<script setup lang="ts">
// Ненавязчивая плашка демо-режима: сообщает, что это витрина только для
// просмотра, и поясняет устройство демо-данных. Закрывается (состояние живёт в
// рамках сессии, чтобы не всплывать на каждой странице). Рендерится лишь когда
// включён демо-режим и активна демо-сессия.
const { public: { demoMode } } = useRuntimeConfig()
const { session } = useOidcAuth()

const isDemo = computed(() => demoMode && (session.value as { demo?: boolean } | null)?.demo === true)

// Общее на всё приложение: закрыли — не показываем до перезагрузки.
const dismissed = useState('demo-banner-dismissed', () => false)
</script>

<template>
  <UAlert
    v-if="isDemo && !dismissed"
    color="primary"
    variant="subtle"
    icon="i-lucide-flask-conical"
    title="Демо-режим — витрина на демонстрационных данных"
    :close="true"
    class="mb-4"
    @update:open="(open: boolean) => { if (!open) dismissed = true }"
  >
    <template #description>
      <div class="space-y-1">
        <p>Просмотр доступен полностью, изменения отключены (только чтение).</p>
        <p>
          Предметы показывают разные сценарии оценивания:
          <b>«Программирование»</b> — штрафы за просрочку и бонусы за раннюю сдачу,
          <b>«Базы данных»</b> — порог посещаемости (можно «Не аттестован» из-за пропусков),
          <b>«Операционные системы»</b> — несколько групп с разбиением практик по подгруппам.
        </p>
      </div>
    </template>
  </UAlert>
</template>
