<script setup lang="ts">
import type { GroupResponse } from "#shared/types/backend";
import type { Form } from "#ui/types";
import type { TabsItem } from "@nuxt/ui";
import type * as v from "valibot";
import type { StudentTableRow } from "~/components/groups/types";
import { UpdateGroupRequestSchema } from "#shared/types/backend/student-groups";
import {
  patch,
  remove,
  useStudentGroup,
} from "~/composables/api/useStudentsGroups";

const route = useRoute();
const groupId = computed(() => String(route.params.uuid ?? ""));
const activeGroupName = useState<string | null>(
  "groups-active-name",
  () => null,
);
const toast = useToast();
const { toastError } = useApiError();

const { data, pending, error, refresh } = useStudentGroup(groupId);

const group = computed<GroupResponse | null>(() => data.value ?? null);
const subgroupTabPrefix = "subgroup:";

const activeTab = ref("students");
const sortDirection = ref<"asc" | "desc">("asc");
const studentSearch = ref("");

function toggleNameSort(): void {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
}

const usernameCollator = new Intl.Collator("ru-RU", {
  sensitivity: "base",
  numeric: true,
});

// ── Editing state ──────────────────────────────────────────
const isEditing = ref(false);
const editLoading = ref(false);
const showDiscardModal = ref(false);

type EditSchema = v.InferOutput<typeof UpdateGroupRequestSchema>;

const draft = reactive<EditSchema>({
  groupName: "",
  students: [],
});

const editFormRef =
  useTemplateRef<Form<typeof UpdateGroupRequestSchema>>("editForm");

const newStudentsInput = ref("");

const activeSubgroupId = computed<string | null>(() => {
  if (activeTab.value === "students") return null;
  return activeTab.value.replace(subgroupTabPrefix, "");
});

function enterEditMode() {
  if (!group.value) return;
  draft.groupName = group.value.name;
  draft.students = group.value.students.map((s) => ({
    id: s.id,
    username: s.username,
    subgroupId: s.subgroupId,
  }));
  isEditing.value = true;
  studentSearch.value = "";
}

function hasDraftChanges(): boolean {
  if (!group.value) return false;
  if (draft.groupName.trim() !== group.value.name) return true;
  if (draft.students.length !== group.value.students.length) return true;
  return draft.students.some((ds, i) => {
    const gs = group.value!.students[i];
    return (
      !gs || ds.username !== gs.username || ds.subgroupId !== gs.subgroupId
    );
  });
}

function exitEditMode() {
  if (hasDraftChanges()) {
    showDiscardModal.value = true;
    return;
  }
  isEditing.value = false;
  newStudentsInput.value = "";
}

function confirmDiscardChanges() {
  showDiscardModal.value = false;
  isEditing.value = false;
  newStudentsInput.value = "";
}

function cancelDiscardChanges() {
  showDiscardModal.value = false;
}

const displayStudents = computed(() => {
  return isEditing.value ? draft.students : (group.value?.students ?? []);
});

function updateDraftStudentUsername(
  studentId: string | null,
  username: string,
) {
  const student = draft.students.find((s) => s.id === studentId);
  if (student) student.username = username.trim();
}

function updateDraftStudentSubgroup(
  draftIndex: number,
  subgroupId: string | null,
) {
  const student = draft.students[draftIndex];
  if (student) {
    student.subgroupId = subgroupId;
  }
}

function removeDraftStudent(studentId: string | null) {
  const idx = draft.students.findIndex((s) => s.id === studentId);
  if (idx !== -1) draft.students.splice(idx, 1);
}

function parseUsernames(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function addDraftStudents(raw: string, subgroupId: string | null) {
  const usernames = parseUsernames(raw);
  const existing = new Set(draft.students.map((s) => s.username));

  for (const username of usernames) {
    if (!existing.has(username)) {
      draft.students.push({ id: null, username, subgroupId });
      existing.add(username);
    }
  }
}

function handleAddDraftStudents() {
  const text = newStudentsInput.value.trim();
  if (!text) return;
  addDraftStudents(text, activeSubgroupId.value);
  newStudentsInput.value = "";
}

function handleAddDraftPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData("text") ?? "";
  if (!text.includes("\n")) return;
  e.preventDefault();
  addDraftStudents(text, activeSubgroupId.value);
  newStudentsInput.value = "";
}

async function handlePatch() {
  const form = editFormRef.value;
  if (!form) return;

  const data = await form.validate({ transform: true });
  if (!data) return;

  editLoading.value = true;
  try {
    const result = await patch(groupId.value, data);
    if (result.error.value) {
      toastError(result.error.value);
      return;
    }
    isEditing.value = false;
    newStudentsInput.value = "";
    await refresh();
  } finally {
    editLoading.value = false;
  }
}

// ── Tabs & Table ───────────────────────────────────────────
const tabsData = computed(() => {
  const tabs: Array<{
    value: string;
    label: string;
    count: number;
    icon: string;
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    rows: Array<{
      key: string;
      id: string | null;
      username: string;
      subgroupId: string | null;
      draftIndex: number;
    }>;
  }> = [];

  const groupStudents = displayStudents.value;
  const hasSubgroups = (group.value?.subgroups ?? []).length > 0;

  const studentsWithoutSubgroup = groupStudents.filter(
    (s) => s.subgroupId === null,
  );
  if (
    !hasSubgroups &&
    (studentsWithoutSubgroup.length > 0 || isEditing.value)
  ) {
    const studentsRows = studentsWithoutSubgroup.map((student, localIndex) => ({
      key: `students:${String(student.id ?? `${student.username}:${localIndex}`)}`,
      id: student.id,
      username: student.username,
      subgroupId: student.subgroupId ?? null,
      draftIndex: groupStudents.indexOf(student),
    }));

    tabs.push({
      value: "students",
      label: "Студенты",
      count: studentsWithoutSubgroup.length,
      icon: "i-lucide-users-round",
      title: "Основные студенты",
      emptyTitle: "Нет студентов",
      emptyDescription: "В этой вкладке пока нет студентов.",
      rows: studentsRows,
    });
  }

  for (const [index, subgroup] of (group.value?.subgroups ?? []).entries()) {
    const tabValue = `${subgroupTabPrefix}${String(subgroup.id)}`;
    const subgroupStudents = groupStudents.filter(
      (s) => s.subgroupId === subgroup.id,
    );
    const subgroupRows = subgroupStudents.map((student, localIndex) => ({
      key: `${tabValue}:${String(student.id ?? `${student.username}:${localIndex}`)}`,
      id: student.id,
      username: student.username,
      subgroupId: student.subgroupId ?? null,
      draftIndex: groupStudents.indexOf(student),
    }));

    const subgroupLabel = `Подгруппа ${index + 1}`;

    tabs.push({
      value: tabValue,
      label: subgroupLabel,
      count: subgroupStudents.length,
      icon: "i-lucide-git-fork",
      title: subgroupLabel,
      emptyTitle: "Подгруппа пуста",
      emptyDescription: "Студенты для этой подгруппы пока не назначены.",
      rows: subgroupRows,
    });
  }

  return tabs;
});

const groupTabs = computed<TabsItem[]>(() => {
  return tabsData.value.map((tab) => ({
    value: tab.value,
    label: tab.label,
    icon: tab.icon,
    badge: tab.count || undefined,
  }));
});
const availableTabValues = computed<string[]>(() =>
  tabsData.value.map((tab) => tab.value),
);

const activeTabData = computed(() => {
  const tab = tabsData.value.find((item) => item.value === activeTab.value);
  if (tab) {
    return tab;
  }

  return tabsData.value[0] ?? null;
});

const activeTabRows = computed<StudentTableRow[]>(() => {
  const sourceRows = activeTabData.value?.rows ?? [];

  if (isEditing.value) {
    return sourceRows.map((row, index) => ({
      ...row,
      index: index + 1,
    }));
  }

  const sortedRows = [...sourceRows].sort((left, right) => {
    return sortDirection.value === "asc"
      ? usernameCollator.compare(left.username, right.username)
      : usernameCollator.compare(right.username, left.username);
  });

  return sortedRows.map((row, index) => ({
    ...row,
    index: index + 1,
  }));
});

const filteredTabRows = computed<StudentTableRow[]>(() => {
  let rows = activeTabRows.value;
  const q = studentSearch.value.trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) => r.username.toLowerCase().includes(q));
  }
  return rows;
});

const subgroupOptions = computed(() => {
  return (group.value?.subgroups ?? []).map((sg, idx) => ({
    value: sg.id,
    label: `Подгруппа ${idx + 1}`,
  }));
});

watch(
  groupId,
  () => {
    activeGroupName.value = null;
    studentSearch.value = "";
  },
  { immediate: true },
);

watch(
  group,
  (value) => {
    activeGroupName.value = value?.name ?? null;
  },
  { immediate: true },
);

watch(
  availableTabValues,
  (values) => {
    if (!values.length) {
      activeTab.value = "students";
      return;
    }

    if (!activeTab.value || !values.includes(activeTab.value)) {
      const firstValue = values[0];
      if (firstValue) {
        activeTab.value = firstValue;
      }
    }
  },
  { immediate: true },
);

// Group deletion
const deletingGroup = ref(false);
const deleteGroupPending = ref(false);

async function onDeleteGroup() {
  if (deleteGroupPending.value) return;
  deleteGroupPending.value = true;
  const { error } = await remove(groupId.value);
  deleteGroupPending.value = false;
  if (error.value) {
    toastError(error.value, "Ошибка");
    return;
  }
  toast.add({
    title: "Группа удалена",
    color: "success",
    icon: "i-lucide-check",
  });
  await navigateTo("/dashboard/groups");
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="pending && !group">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-12 w-full" />
      <UCard>
        <template #header>
          <USkeleton class="h-6 w-32" />
        </template>
        <div class="flex flex-col gap-2">
          <USkeleton v-for="i in 5" :key="i" class="h-10 w-full" />
        </div>
      </UCard>
    </template>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Ошибка при загрузке группы"
      :description="error.message"
    />

    <template v-else-if="group">
      <ULink
        to="/dashboard/groups"
        class="text-sm text-muted hover:text-default flex items-center gap-1 -mb-2"
      >
        <UIcon name="i-lucide-arrow-left" />
        К списку групп
      </ULink>

      <GroupsDetailHeader
        v-model="draft.groupName"
        :name="group.name"
        :students-count="group.students.length"
        :subgroups-count="group.subgroups.length"
        :is-editing="isEditing"
        :edit-loading="editLoading"
        @edit="enterEditMode"
        @cancel="exitEditMode"
        @save="handlePatch"
        @delete="deletingGroup = true"
      />

      <UTabs v-if="groupTabs.length" v-model="activeTab" :items="groupTabs" />

      <!-- View mode: Table -->
      <template v-if="!isEditing">
        <UCard v-if="groupTabs.length && activeTabData">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold">
                  {{ activeTabData.title }}
                </h3>
                <UBadge color="neutral" variant="soft">
                  {{ activeTabRows.length }}
                </UBadge>
              </div>
              <UButton
                icon="i-lucide-user-plus"
                label="Добавить"
                variant="ghost"
                @click="enterEditMode"
              />
            </div>
          </template>

          <div class="mb-4">
            <UInput
              v-model="studentSearch"
              icon="i-lucide-search"
              placeholder="Поиск по имени..."
              class="w-full sm:w-72"
            />
          </div>

          <GroupsStudentsTable
            :rows="filteredTabRows"
            :loading="pending"
            :sort-direction="sortDirection"
            :empty-title="activeTabData.emptyTitle"
            :empty-description="activeTabData.emptyDescription"
            @toggle-sort="toggleNameSort"
          />
        </UCard>

        <UCard v-else>
          <UEmpty
            icon="i-lucide-users"
            title="В группе пока нет студентов и подгрупп"
            description="Добавьте студентов в группу или создайте подгруппы."
            variant="naked"
            :actions="[
              {
                label: 'Добавить студентов',
                icon: 'i-lucide-user-plus',
                onClick: enterEditMode,
              },
            ]"
          />
        </UCard>
      </template>

      <!-- Edit mode: Inline list -->
      <template v-else>
        <UForm
          ref="editForm"
          :schema="UpdateGroupRequestSchema"
          :state="draft"
          class="flex flex-col gap-4"
        >
          <UCard v-if="groupTabs.length && activeTabData">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold">
                    {{ activeTabData.title }}
                  </h3>
                  <UBadge color="neutral" variant="soft">
                    {{ activeTabRows.length }}
                  </UBadge>
                </div>
              </div>
            </template>

            <div class="mb-4">
              <UInput
                v-model="studentSearch"
                icon="i-lucide-search"
                placeholder="Поиск по имени..."
                class="w-full sm:w-72"
              />
            </div>

            <GroupsStudentsEditor
              v-model:new-students-input="newStudentsInput"
              :rows="filteredTabRows"
              :empty-description="activeTabData.emptyDescription"
              :subgroups="subgroupOptions"
              @update-username="updateDraftStudentUsername"
              @update-subgroup="updateDraftStudentSubgroup"
              @remove="removeDraftStudent"
              @add="handleAddDraftStudents"
              @paste="handleAddDraftPaste"
            />
          </UCard>

          <UCard v-else>
            <UEmpty
              icon="i-lucide-users"
              title="В группе пока нет студентов и подгрупп"
              description="Добавьте студентов в группу или создайте подгруппы."
              variant="naked"
              :actions="[
                {
                  label: 'Добавить студентов',
                  icon: 'i-lucide-user-plus',
                  onClick: enterEditMode,
                },
              ]"
            />
          </UCard>
        </UForm>
      </template>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-search-x"
      title="Группа не найдена"
      description="Проверьте ссылку или вернитесь к списку групп."
      variant="naked"
      class="h-full"
    />

    <GroupsDeleteModal
      :open="deletingGroup"
      :pending="deleteGroupPending"
      @close="deletingGroup = false"
      @confirm="onDeleteGroup"
    />

    <GroupsDiscardChangesModal
      v-model:open="showDiscardModal"
      @confirm="confirmDiscardChanges"
      @cancel="cancelDiscardChanges"
    />
  </div>
</template>
