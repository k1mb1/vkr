<template>
  <NuxtLayout name="dashboard">
    <BaseDashboardPanel
      id="dashboard-debug"
      title="Backend Debug"
    >
      <template #body>
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
      </template>
    </BaseDashboardPanel>
  </NuxtLayout>
</template>
