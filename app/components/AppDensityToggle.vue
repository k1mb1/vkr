<script setup lang="ts">
import type { TableDensity } from '~/utils/tableUi'

// Плотность секционных таблиц. Раньше была одна иконка-переключатель — непонятно,
// что она делает. Теперь явный сегментированный контрол с подписями: видно и сам
// смысл (плотность строк), и какой режим сейчас выбран.
const { density } = useTableDensity()

const options: { value: TableDensity, label: string, icon: string }[] = [
  { value: 'comfortable', label: 'Обычная', icon: 'i-lucide-rows-2' },
  { value: 'compact', label: 'Компактная', icon: 'i-lucide-rows-3' },
]
</script>

<template>
  <UFieldGroup size="sm">
    <UButton
      v-for="opt in options"
      :key="opt.value"
      :icon="opt.icon"
      :label="opt.label"
      :color="density === opt.value ? 'primary' : 'neutral'"
      :variant="density === opt.value ? 'subtle' : 'outline'"
      :aria-pressed="density === opt.value"
      :title="`Плотность таблицы: ${opt.label.toLowerCase()}`"
      @click="density = opt.value"
    />
  </UFieldGroup>
</template>
