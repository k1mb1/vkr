<script setup lang="ts">
const { user } = useOidcAuth()
</script>

<template>
  <UPage>
    <UPageSection
      title="Profile"
      description="Protected profile stub"
    >
      <UCard>
        <div class="space-y-2">
          <p><strong>sub:</strong> {{ user?.sub || 'n/a' }}</p>
          <p><strong>email:</strong> {{ user?.email || 'n/a' }}</p>
          <p><strong>name:</strong> {{ user?.name || 'n/a' }}</p>
        </div>
      </UCard>
    </UPageSection>
  </UPage>
</template>
