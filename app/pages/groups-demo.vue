<template>
  <UPage>
    <UPageSection
      title="Groups demo"
      description="Component-level access examples with GroupGate."
    >
      <div class="grid gap-4">
        <UCard>
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
        </UCard>

        <UCard>
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
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-semibold">
              Admin + Support block
            </h3>
          </template>

          <GroupGate
            :required-groups="['ADMIN', 'SUPPORT']"
            mode="all"
          >
            <p>Visible only if both groups are present.</p>
            <template #denied>
              <UAlert
                color="warning"
                variant="soft"
                title="No access"
                description="Need groups: ADMIN and SUPPORT"
              />
            </template>
          </GroupGate>
        </UCard>
      </div>
    </UPageSection>
  </UPage>
</template>
