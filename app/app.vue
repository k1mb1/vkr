<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
  ],
  htmlAttrs: {
    lang: 'en',
  },
})

const title = 'Nuxt OIDC Starter'
const description = 'Nuxt UI + nuxt-auth-utils scaffold for Pocket ID and OIDC flows with protected pages and token refresh.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/cover.jpg',
  twitterImage: 'https://ui.nuxt.com/assets/cover.jpg',
  twitterCard: 'summary_large_image',
})

const route = useRoute()
const rootLayout = computed(() => route.path.startsWith('/dashboard') ? false : 'landing')
</script>

<template>
  <UApp>
    <NuxtLayout :name="rootLayout">
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
