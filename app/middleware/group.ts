type RouteMetaWithGroups = {
  requiredGroups?: string[]
}

export default defineNuxtRouteMiddleware((to) => {
  const meta = to.meta as RouteMetaWithGroups
  const requiredGroups = meta.requiredGroups ?? []

  if (!requiredGroups.length) {
    return
  }

  const { hasGroups } = useGroupAccess()
  const hasAccess = hasGroups(requiredGroups, 'any')

  if (!hasAccess) {
    const required = encodeURIComponent(requiredGroups.map(group => group.toUpperCase()).join(','))
    const from = encodeURIComponent(to.fullPath)
    return navigateTo(`/forbidden?required=${required}&from=${from}`)
  }
})
