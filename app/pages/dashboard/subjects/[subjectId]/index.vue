<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

onMounted(() => {
  router.replace(`/dashboard/subjects/${subjectId.value}/grades`)
})
</script>

<template>
  <div class="flex h-64 items-center justify-center">
    <ULoadingIcon />
  </div>
</template>
