<script setup lang="ts">
import type { StudentTableRow } from "./types";

interface SubgroupOption {
  value: string;
  label: string;
}

interface Props {
  rows: StudentTableRow[];
  emptyDescription: string;
  newStudentsInput: string;
  subgroups?: SubgroupOption[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:newStudentsInput": [value: string];
  updateUsername: [studentId: string | null, username: string];
  updateSubgroup: [draftIndex: number, subgroupId: string | null];
  remove: [studentId: string | null];
  add: [];
  paste: [e: ClipboardEvent];
}>();

const hasSubgroups = computed(() => (props.subgroups ?? []).length > 0);
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="row in rows"
      :key="row.key"
      class="flex items-center gap-2"
      :class="row.id === null ? 'rounded-lg bg-success/5 px-2 py-1 -mx-2' : ''"
    >
      <span class="w-8 text-center text-sm text-muted">{{ row.index }}</span>
      <UInput
        :model-value="row.username"
        class="flex-1"
        @update:model-value="(v: string) => emit('updateUsername', row.id, v)"
      />
      <USelect
        v-if="hasSubgroups"
        :model-value="row.subgroupId ?? 'none'"
        :items="[
          { value: 'none', label: 'Без подгруппы' },
          ...(subgroups ?? []),
        ]"
        class="w-44"
        @update:model-value="
          (v: string) =>
            emit('updateSubgroup', row.draftIndex, v === 'none' ? null : v)
        "
      />
      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        @click="emit('remove', row.id)"
      />
    </div>

    <div v-if="rows.length === 0" class="py-4 text-sm text-muted">
      {{ emptyDescription }}
    </div>

    <UInput
      :model-value="newStudentsInput"
      placeholder="Добавьте студентов (Enter или вставьте список)"
      icon="i-lucide-user-plus"
      class="mt-2"
      @update:model-value="(v) => emit('update:newStudentsInput', v)"
      @keydown.enter.prevent="emit('add')"
      @paste="(e: ClipboardEvent) => emit('paste', e)"
    />
  </div>
</template>
