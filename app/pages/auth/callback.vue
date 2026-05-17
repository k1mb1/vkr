<template>
  <UPage>
    <UPageSection
      title="Processing callback"
      description="This page is a stub. Real callback is handled by /auth/oidc server route."
      class="max-w-2xl mx-auto"
    >
      <UCard :ui="{ body: 'flex flex-col gap-4' }">
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-info"
          title="Callback route"
          description="If your provider sends users to /auth/callback, reconfigure it to /auth/oidc."
        />

        <UButton
          to="/auth/login"
          icon="i-lucide-arrow-left"
        >
          Back to login
        </UButton>
      </UCard>
    </UPageSection>
  </UPage>
</template>
