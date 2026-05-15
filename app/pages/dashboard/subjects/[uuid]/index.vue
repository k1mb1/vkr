<script setup lang="ts">
import type { User } from '#auth-utils'

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { user } = useOidcAuth()

const { sub: teacherId } = user.value as User

const { permissions, fetchPermissions } = usePermissions(subjectId.value, teacherId!)
await fetchPermissions()
</script>

<template>
  <div>
    <UAlert title="page" />
  </div>
</template>
