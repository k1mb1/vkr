<script setup lang="ts">
const color = defineModel<string>({ required: true })
</script>

<template>
  <UPopover>
    <UButton color="neutral" variant="outline" class="w-full">
      <template #leading>
        <span class="size-3 rounded-full" :style="{ backgroundColor: color }" />
      </template>
      <span class="font-mono">{{ color }}</span>
    </UButton>

    <template #content>
      <div class="flex flex-col gap-2 p-2">
        <UColorPicker v-model="color" />
        <UInput v-model="color" :style="{ color }">
          <template #leading>
            <span class="size-4 rounded-full" :style="{ backgroundColor: color }" />
          </template>
        </UInput>
      </div>
    </template>
  </UPopover>
</template>
