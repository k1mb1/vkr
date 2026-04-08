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
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You do not have required group permissions for this page.',
      data: {
        from: to.fullPath,
        requiredGroups: requiredGroups.map(group => group.toUpperCase())
      }
    })
  }
})
