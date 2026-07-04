const PUBLIC_PATHS = ['/', '/auth/login', '/auth/callback', '/logout', '/demo']

export default defineNuxtRouteMiddleware((to) => {
  const isPublicAuthArea = to.path.startsWith('/auth/')
  const isPublicCheckIn = to.path.startsWith('/check-in/')
  const isPublic = isPublicAuthArea || isPublicCheckIn || PUBLIC_PATHS.includes(to.path)

  if (isPublic) {
    return
  }

  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    const redirect = encodeURIComponent(to.fullPath)
    return navigateTo(`/auth/login?redirect=${redirect}`)
  }
})
