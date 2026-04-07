<script setup lang="ts">
definePageMeta({
  middleware: ['group'],
  requiredGroups: ['ADMIN', 'MANAGER']
})
</script>

<template>
  <UPage>
    <UPageSection
      title="Admin area"
      description="Only users in admin group can access this page."
    >
      <UCard>
        <p>Welcome to admin-only section.</p>
      </UCard>
    </UPageSection>
  </UPage>
</template>
