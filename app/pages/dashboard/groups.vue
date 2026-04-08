<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-groups"
    title="Groups"
  >
    <template #body>
      <div class="grid gap-4">
        <UPageCard>
          <template #header>
            <h3 class="font-semibold">
              Admin block
            </h3>
          </template>

          <GroupGate :required-groups="['ADMIN']">
            <p>Visible only for admin group.</p>
            <template #denied>
              <UAlert
                color="warning"
                variant="soft"
                title="No access"
                description="Need group: ADMIN"
              />
            </template>
          </GroupGate>
        </UPageCard>

        <UPageCard>
          <template #header>
            <h3 class="font-semibold">
              Editor or Support block
            </h3>
          </template>

          <GroupGate
            :required-groups="['EDITOR', 'SUPPORT']"
            mode="any"
          >
            <p>Visible for editor or support.</p>
            <template #denied>
              <UAlert
                color="warning"
                variant="soft"
                title="No access"
                description="Need group: EDITOR or SUPPORT"
              />
            </template>
          </GroupGate>
        </UPageCard>
      </div>
    </template>
  </BaseDashboardPanel>
</template>
