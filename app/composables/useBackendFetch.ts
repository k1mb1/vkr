import type { useFetch } from 'nuxt/app'
import type { FetchError } from 'ofetch'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { ref, toValue } from 'vue'

type UseFetchOptionsFor<T> = NonNullable<Parameters<typeof useFetch<T>>[1]>
type BackendFetchResult<T> = ReturnType<typeof useFetch<T>>
type BackendFetchOptions<T> = UseFetchOptionsFor<T> & {
  requiresAuth?: MaybeRefOrGetter<boolean>
}

const _useProxyFetch = createUseFetch({ baseURL: '/api/proxy' })

function useBackendFetch<T>(
  url: string | (() => string),
  { requiresAuth, headers, ...opts }: BackendFetchOptions<T> = {},
): BackendFetchResult<T> {
  let requestHeaders: HeadersInit | Headers | undefined = headers as HeadersInit | undefined

  if (!(toValue(requiresAuth) ?? true)) {
    const h = new Headers(headers as HeadersInit | undefined)
    h.set('x-proxy-auth-optional', 'true')
    requestHeaders = h
  }

  return _useProxyFetch<T>(url as string, {
    ...opts,
    headers: requestHeaders,
  }) as BackendFetchResult<T>
}

type BackendResultStatus = 'idle' | 'pending' | 'success' | 'error'

interface BackendResult<T> {
  data: Ref<T | null>
  error: Ref<FetchError | null>
  status: Ref<BackendResultStatus>
  refresh: () => Promise<void>
  clear: () => void
}

async function $backendFetch<T>(
  url: string,
  opts?: Parameters<typeof $fetch>[1],
): Promise<BackendResult<T>> {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<FetchError | null>(null) as Ref<FetchError | null>
  const status = ref<BackendResultStatus>('idle')

  const refresh = async () => {
    status.value = 'pending'
    error.value = null
    data.value = null
    try {
      data.value = await $fetch<T>(url, { ...opts, baseURL: '/api/proxy' })
      status.value = 'success'
    }
    catch (e) {
      error.value = e as FetchError
      status.value = 'error'
    }
  }

  const clear = () => {
    data.value = null
    error.value = null
    status.value = 'idle'
  }

  await refresh()

  return { data, error, status, refresh, clear }
}

export { $backendFetch, useBackendFetch }
export type { BackendFetchOptions, BackendFetchResult, BackendResult, BackendResultStatus }
