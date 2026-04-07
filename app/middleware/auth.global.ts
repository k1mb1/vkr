const PUBLIC_PATHS = ['/', '/auth/login', '/auth/callback', '/auth-error', '/logout']

export default defineNuxtRouteMiddleware((to) => {
  const isPublicAuthArea = to.path.startsWith('/auth/')
  const isPublic = isPublicAuthArea || PUBLIC_PATHS.includes(to.path)

  if (isPublic) {
    return
  }

  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    const redirect = encodeURIComponent(to.fullPath)
    return navigateTo(`/auth/login?redirect=${redirect}`)
  }
})
