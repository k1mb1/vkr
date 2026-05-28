export default defineNuxtRouteMiddleware((to) => {
  const subjectId = String(to.params.uuid ?? '')

  const { hasAllPermissions } = usePermissions(subjectId)

  if (!hasAllPermissions.value) {
    return navigateTo(`/dashboard/subjects/${subjectId}`)
  }
})
