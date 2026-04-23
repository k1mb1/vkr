<script setup lang="ts">
import * as uiLocales from '@nuxt/ui/locale'

const { full = false } = defineProps<{ full?: boolean }>()

const { locale, availableLocales, setLocale } = useI18n()

const filteredLocales = computed(() =>
  Object.values(uiLocales).filter(l => (availableLocales as string[]).includes(l.code)),
)
</script>

<template>
  <ULocaleSelect
    :model-value="locale"
    :locales="filteredLocales"
    :class="full ? 'w-full' : undefined"
    :variant="full ? 'outline' : 'ghost'"
    @update:model-value="setLocale($event as Parameters<typeof setLocale>[0])"
  />
</template>
