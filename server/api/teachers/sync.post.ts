import type { UpdateTeacherRequest } from '#shared/types/backend'
import { getAccessToken } from '#server/utils/getAccessToken'

type OidcUserProfile = {
  sub?: string
  email?: string
  name?: string
}

function resolveUsername(profile: OidcUserProfile, email: string): string {
  const name = profile.name?.trim()
  if (name) {
    return name
  }

  return email.split('@')[0] || 'teacher'
}

function resolveTeacherSyncPayload(profile: OidcUserProfile): {
  id: string
  request: UpdateTeacherRequest
} | null {
  const id = profile.sub?.trim()
  const email = profile.email?.trim()

  if (!id || !email) {
    return null
  }

  return {
    id,
    request: {
      username: resolveUsername(profile, email),
      email
    }
  }
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const profile = session.user as OidcUserProfile | null | undefined
  const accessToken = await getAccessToken(event)

  if (!profile) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const payload = resolveTeacherSyncPayload(profile)
  if (!payload) {
    return {
      ok: false,
      skipped: true,
      reason: 'Teacher sync skipped: missing user id or email'
    }
  }

  const config = useRuntimeConfig(event)
  const baseURL = (config.public.backendBaseUrl as string) || undefined

  await $fetch(`/teachers/${payload.id}`, {
    method: 'PUT',
    baseURL,
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: payload.request
  })

  return {
    ok: true
  }
})
