<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

type ErrorData = {
  from?: string
  requiredGroups?: string[]
}

const statusCode = computed(() => props.error.statusCode ?? props.error.status ?? 500)
const statusMessage = computed(() => props.error.statusMessage ?? props.error.statusText ?? 'Unexpected Error')
const errorMessage = computed(() => props.error.message || 'Something went wrong. Please try again.')
const errorData = computed(() => (props.error.data ?? {}) as ErrorData)

const isAuthError = computed(() => statusCode.value === 401)
const isForbidden = computed(() => statusCode.value === 403)

const fallbackFrom = computed(() => {
  const from = errorData.value.from
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from
  }

  return '/dashboard'
})

const loginPath = computed(() => `/auth/login?redirect=${encodeURIComponent(fallbackFrom.value)}`)
const requiredGroups = computed(() => Array.isArray(errorData.value.requiredGroups) ? errorData.value.requiredGroups : [])

const title = computed(() => {
  if (statusCode.value === 401) {
    return 'Authentication required'
  }

  if (statusCode.value === 403) {
    return 'Access denied'
  }

  return statusMessage.value
})

const message = computed(() => {
  if (statusCode.value === 401) {
    return 'Your session is missing or expired. Sign in again to continue.'
  }

  if (statusCode.value === 403) {
    return 'You do not have the required group permissions for this page.'
  }

  return errorMessage.value
})

const goHome = async () => {
  await clearError({ redirect: '/' })
}

const goBack = async () => {
  await clearError({ redirect: fallbackFrom.value })
}
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />
        <UButton
          to="https://github.com/atinux/nuxt-auth-utils"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="nuxt-auth-utils"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UHeader>

    <UError
      :clear="false"
      :error="{
        statusCode,
        statusMessage: title,
        message
      }"
    >
      <template #links>
        <UButton
          v-if="isAuthError"
          :to="loginPath"
          icon="i-lucide-log-in"
        >
          Login
        </UButton>

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
          @click="goBack"
        >
          Back
        </UButton>

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-house"
          @click="goHome"
        >
          Home
        </UButton>
      </template>

      <template #default>
        <div
          v-if="isForbidden && requiredGroups.length"
          class="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          <UBadge
            v-for="group in requiredGroups"
            :key="group"
            color="warning"
            variant="soft"
          >
            {{ group }}
          </UBadge>
        </div>
      </template>
    </UError>
  </UApp>
</template>
