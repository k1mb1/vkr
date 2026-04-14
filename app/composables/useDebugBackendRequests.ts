const DEBUG_HISTORY_LIMIT = 40

const REDACTED_KEYS = new Set([
  'authorization',
  'access_token',
  'refresh_token',
  'token',
  'password',
  'secret',
  'api_key',
  'apikey',
])

type SafeValue = string | number | boolean | null | undefined | SafeValue[] | { [key: string]: SafeValue }

export interface DebugRequestEntry {
  id: string
  createdAt: number
  method: string
  path: string
  requiresAuth: boolean
  query: SafeValue | undefined
  body: SafeValue | undefined
  response: SafeValue | undefined
  statusCode: number | null
  durationMs: number
  error: string | null
}

export interface DebugRequestEntryInput {
  method: string
  path: string
  requiresAuth: boolean
  query?: unknown
  body?: unknown
  response?: unknown
  statusCode?: number | null
  durationMs: number
  error?: string | null
}

function sanitizeValue(value: unknown): SafeValue {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item))
  }

  if (typeof value === 'object') {
    const safeRecord: { [key: string]: SafeValue } = {}

    for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(rawKey.toLowerCase())) {
        safeRecord[rawKey] = '[REDACTED]'
        continue
      }

      safeRecord[rawKey] = sanitizeValue(rawValue)
    }

    return safeRecord
  }

  return String(value)
}

function normalizeError(error: string | null | undefined): string | null {
  if (!error) {
    return null
  }

  const trimmed = error.trim()
  return trimmed.length ? trimmed : null
}

export function useDebugBackendRequests() {
  const history = useState<DebugRequestEntry[]>('debug-backend-requests-history', () => [])

  function addEntry(input: DebugRequestEntryInput) {
    const entry: DebugRequestEntry = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      method: input.method.toUpperCase(),
      path: input.path,
      requiresAuth: input.requiresAuth,
      query: input.query === undefined ? undefined : sanitizeValue(input.query),
      body: input.body === undefined ? undefined : sanitizeValue(input.body),
      response: input.response === undefined ? undefined : sanitizeValue(input.response),
      statusCode: input.statusCode ?? null,
      durationMs: input.durationMs,
      error: normalizeError(input.error),
    }

    history.value = [entry, ...history.value].slice(0, DEBUG_HISTORY_LIMIT)
  }

  function clearHistory() {
    history.value = []
  }

  return {
    history,
    addEntry,
    clearHistory,
  }
}
