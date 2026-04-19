<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-debug" panel-title="Backend Debug">
    <DevOnly>
      <DashboardDevBackendDebug />

      <template #fallback>
        <UAlert
          color="warning"
          variant="soft"
          title="Dev only"
          description="Debug tool is available only in development mode."
        />
      </template>
    </DevOnly>
  </NuxtLayout>
</template>
