<script setup lang="ts">
const route = useRoute()
const { user } = useOidcAuth()

const requiredGroups = computed(() => {
  const value = route.query.required
  if (typeof value !== 'string' || !value.length) {
    return []
  }

  return decodeURIComponent(value)
    .split(',')
    .map(group => group.trim())
    .filter(Boolean)
})

const currentGroups = computed(() => user.value?.groups ?? [])
</script>

<template>
  <UPage>
    <UPageSection
      title="Access denied"
      description="You do not have required group permissions."
    >
      <UCard>
        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium mb-2">
              Required groups
            </p>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="group in requiredGroups"
                :key="group"
                color="warning"
                variant="soft"
              >
                {{ group }}
              </UBadge>
              <UBadge
                v-if="!requiredGroups.length"
                color="neutral"
                variant="soft"
              >
                none
              </UBadge>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium mb-2">
              Your groups
            </p>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="group in currentGroups"
                :key="group"
                color="info"
                variant="soft"
              >
                {{ group }}
              </UBadge>
              <UBadge
                v-if="!currentGroups.length"
                color="neutral"
                variant="soft"
              >
                none
              </UBadge>
            </div>
          </div>

          <div class="flex gap-3">
            <UButton
              to="/dashboard"
              icon="i-lucide-arrow-left"
            >
              Back to dashboard
            </UButton>
            <UButton
              to="/"
              color="neutral"
              variant="outline"
            >
              Home
            </UButton>
          </div>
        </div>
      </UCard>
    </UPageSection>
  </UPage>
</template>
