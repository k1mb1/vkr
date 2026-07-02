import type { AsyncData, NuxtError } from '#app'

/** Fields-style ответ SDK client-ofetch при throwOnError=false. */
interface FieldsResponse<T> {
  data?: T
  error?: unknown
  response?: Response
}

interface FieldError {
  field?: string
  message?: string
}

/** Нормализованная ошибка API — форма повторяет ErrorDto бэкенда. */
export interface ApiError {
  status?: number
  code?: string
  message: string
  fieldErrors?: FieldError[]
  cause?: unknown
}

type WatchSources = Parameters<typeof useAsyncData>[2] extends infer O
  ? O extends { watch?: infer W } ? W : never
  : never

export interface UseApiOptions<T> {
  key: string
  /**
   * - `silent` (по умолчанию) — ошибка только в `error`, страница сама решает;
   * - `fatal` — showError → error.vue;
   * - `toast` — всплывашка.
   */
  on_error?: 'silent' | 'fatal' | 'toast'
  watch?: WatchSources
  lazy?: boolean
  immediate?: boolean
  transform?: (data: T) => T
}

/**
 * Реактивная обёртка над SDK-вызовом через useAsyncData: распаковывает
 * fields-style { data, error } и нормализует ошибку в {@link ApiError}.
 */
export function useApi<T>(
  options: UseApiOptions<T>,
  handler: () => Promise<FieldsResponse<T>>,
): AsyncData<T | null, ApiError> {
  const { key, on_error = 'silent', transform } = options

  const asyncData = useAsyncData<T | null>(
    key,
    async () => {
      try {
        const res = await handler()
        if (res.error !== undefined && res.error !== null)
          throw res.error
        const payload = res.data ?? null
        return transform && payload !== null ? transform(payload) : payload
      }
      catch (raw) {
        logApiError(key, raw)
        throw raw
      }
    },
    {
      ...(options.lazy !== undefined ? { lazy: options.lazy } : {}),
      ...(options.immediate !== undefined ? { immediate: options.immediate } : {}),
      ...(options.watch ? { watch: options.watch } : {}),
    },
  )

  const normalizedError = computed<ApiError | null>(() => {
    const raw = asyncData.error.value as NuxtError<unknown> | null
    return raw ? toApiError(raw) : null
  })

  if (on_error !== 'silent') {
    const toast = on_error === 'toast' ? useToast() : null
    watch(normalizedError, (apiError) => {
      if (!apiError)
        return
      if (on_error === 'fatal') {
        showError({ statusCode: apiError.status ?? 500, statusMessage: apiError.message, data: apiError, fatal: true })
        return
      }
      toast!.add({ title: apiError.message, color: 'error', icon: 'i-lucide-circle-alert' })
    })
  }

  return { ...asyncData, error: normalizedError } as AsyncData<T | null, ApiError>
}

/**
 * Императивный вызов для мутаций. Возвращает нормализованный `error` —
 * обычно его `fieldErrors` раскладывают под поля формы через `setErrors`.
 */
export async function $api<T>(
  handler: () => Promise<FieldsResponse<T>>,
): Promise<{ data: T | null, error: ApiError | null }> {
  try {
    const res = await handler()
    if (res.error !== undefined && res.error !== null) {
      logApiError('$api', res.error)
      return { data: null, error: toApiError(res.error) }
    }
    return { data: res.data ?? null, error: null }
  }
  catch (raw) {
    logApiError('$api', raw)
    return { data: null, error: toApiError(raw) }
  }
}

interface ErrorDtoLike {
  code?: string
  message?: string
  status?: number
  fieldErrors?: FieldError[]
}

/** valibot ValiError: путь до поля + что ждали / что пришло. */
interface ValibotIssue {
  message?: string
  expected?: string
  received?: string
  path?: { key?: PropertyKey }[]
}

/**
 * В dev валит сырую ошибку в консоль. Для valibot-ошибок SDK (request/response
 * validator) дополнительно раскладывает issues: путь до поля + expected/received.
 * Так «Expected string but received null» перестаёт быть анонимным — сразу
 * видно, какое поле (например `content.0.description`) прислал бэкенд или какой
 * query улетел пустым.
 */
function logApiError(key: string, raw: unknown): void {
  if (!import.meta.dev)
    return

  const issues = (raw as { issues?: ValibotIssue[] })?.issues
  if (Array.isArray(issues) && issues.length > 0) {
    const details = issues.map((i) => {
      const path = (i.path ?? []).map(p => String(p.key)).join('.') || '(root)'
      return { path, expected: i.expected, received: i.received, message: i.message }
    })
    console.error(`[useApi:${key}] valibot validation failed`, details, raw)
    return
  }

  console.error(`[useApi:${key}]`, raw)
}

export function toApiError(raw: unknown): ApiError {
  const e = raw as {
    statusCode?: number
    status?: number
    statusMessage?: string
    message?: string
    data?: ErrorDtoLike
    cause?: unknown
  } & ErrorDtoLike

  // client-ofetch (ignoreResponseError) бросает сырой ErrorDto на верхнем
  // уровне; ofetch FetchError кладёт тело в .data — поддерживаем обе формы.
  const dto: ErrorDtoLike = (e?.data ?? e ?? {}) as ErrorDtoLike
  const status = e?.statusCode ?? e?.status ?? dto?.status
  const message = dto?.message ?? e?.statusMessage ?? e?.message ?? 'Неизвестная ошибка'

  return {
    status,
    code: dto?.code,
    message,
    fieldErrors: dto?.fieldErrors,
    cause: e?.cause ?? e,
  }
}
