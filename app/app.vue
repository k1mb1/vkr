<script setup lang="ts">
import * as uiLocales from "@nuxt/ui/locale";

const { locale } = useI18n();

const currentUiLocale = computed(
  () => uiLocales[locale.value as keyof typeof uiLocales] ?? uiLocales.en,
);

useHead({
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: () => currentUiLocale.value.code,
    dir: () => currentUiLocale.value.dir,
  },
});

const title = "Классный журнал";
const description =
  "Цифровой журнал для преподавателей — оценки, посещаемость и успеваемость учеников в одном месте.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
});
</script>

<template>
  <UApp :locale="currentUiLocale">
    <NuxtLoadingIndicator />
    <NuxtPage :keepalive="{ max: 10 }" />
  </UApp>
</template>
