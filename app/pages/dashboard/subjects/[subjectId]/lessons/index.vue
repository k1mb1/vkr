<script setup lang="ts">
const route = useRoute()

const subjectId = computed(() => String(route.params.subjectId ?? ''))

function onAfterCreate() {
  // Reserved for future list refresh after create actions.
}
</script>

<template>
  <section class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">
        Lessons
      </h1>
      <p class="text-sm text-muted">
        Subject: {{ subjectId }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <LessonsCreateLessonModal :subject-id="subjectId" :after-create="onAfterCreate" />
      <LessonsCreateLessonsByTypeModal :subject-id="subjectId" :after-create="onAfterCreate" />
      <LessonsCreateBulkScheduleModal :subject-id="subjectId" :after-create="onAfterCreate" />
    </div>
  </section>
</template>
