<script setup lang="ts">
export interface HighlightColorField {
  key: string
  label: string
  help?: string
}

export interface HighlightPolicyState {
  enabled: boolean
  [key: string]: string | boolean
}

const props = defineProps<{
  state: HighlightPolicyState
  colorFields: HighlightColorField[]
  switchLabel: string
  description: string
  loading?: boolean
  settingsPath: string
}>()

// Реактивный объект формы принадлежит странице; мутируем его напрямую (как в
// LessonsScopeForm), поэтому работаем через локальный алиас, а не через props.
const form = props.state
</script>

<template>
  <UCard :ui="{ body: 'flex flex-col gap-4' }">
    <USwitch
      v-model="form.enabled"
      :label="switchLabel"
    />

    <p class="text-sm text-muted">
      {{ description }}
    </p>

    <template v-if="form.enabled">
      <USeparator />

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField
          v-for="field in colorFields"
          :key="field.key"
          :label="field.label"
          :name="field.key"
          required
        >
          <ColorPickerPopover
            :model-value="String(form[field.key])"
            @update:model-value="(v: string) => form[field.key] = v"
          />
          <template v-if="field.help" #help>
            {{ field.help }}
          </template>
        </UFormField>
      </div>
    </template>
  </UCard>

  <div class="flex justify-end gap-2">
    <UButton
      :to="settingsPath"
      color="neutral"
      variant="ghost"
      type="button"
    >
      Отмена
    </UButton>
    <UButton
      type="submit"
      icon="i-lucide-check"
      :loading="loading"
    >
      Сохранить
    </UButton>
  </div>
</template>
