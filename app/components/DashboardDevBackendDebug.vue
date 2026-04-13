<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type DebugRequestBody = BodyInit | object | null | undefined

type QueryRecord = Record<string, string | number | boolean | null | undefined | Array<string | number | boolean | null | undefined>>

type ApiErrorPayload = {
  statusCode?: number
  statusMessage?: string
  message?: string
}

type ApiErrorShape = {
  message?: string
  data?: ApiErrorPayload
}

const tabItems: TabsItem[] = [
  {
    label: 'Request',
    icon: 'i-lucide-send',
    value: 'request'
  },
  {
    label: 'History',
    icon: 'i-lucide-history',
    value: 'history'
  }
]

const methodItems: TabsItem[] = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' }
]

const activeTab = ref<string>('request')
const method = ref<HttpMethod>('GET')
const path = ref('/subjects')
const queryText = ref('')
const bodyText = ref('')
const requiresAuth = ref(true)

const loading = ref(false)
const parseError = ref<string | null>(null)
const lastError = ref<string | null>(null)
const lastStatusCode = ref<number | null>(null)
const lastDurationMs = ref<number | null>(null)
const lastResponse = ref<unknown>(null)

const { history, addEntry, clearHistory } = useDebugBackendRequests()

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit'
  }).format(timestamp)
}

function formatJson(value: unknown): string {
  if (value === undefined) {
    return 'undefined'
  }

  if (value === null) {
    return 'null'
  }

  return JSON.stringify(value, null, 2)
}

function parseQuery(input: string): QueryRecord | undefined {
  const trimmed = input.trim()
  if (!trimmed.length) {
    return undefined
  }

  const parsed = JSON.parse(trimmed)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Query must be a JSON object')
  }

  return parsed as QueryRecord
}

function parseBody(input: string): DebugRequestBody {
  const trimmed = input.trim()
  if (!trimmed.length) {
    return undefined
  }

  const parsed = JSON.parse(trimmed) as unknown

  if (parsed === null || typeof parsed === 'string') {
    return parsed
  }

  if (typeof parsed === 'object') {
    return parsed
  }

  throw new Error('Body must be JSON object, array, string or null')
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  const apiError = error as ApiErrorShape
  return apiError.data?.statusMessage || apiError.data?.message || apiError.message || 'Request failed'
}

async function executeRequest() {
  const normalizedPath = path.value.trim()
  if (!normalizedPath.length) {
    parseError.value = 'Path is required'
    return
  }

  parseError.value = null
  lastError.value = null
  lastResponse.value = null
  lastStatusCode.value = null

  let query: QueryRecord | undefined
  let body: DebugRequestBody

  try {
    query = parseQuery(queryText.value)
    body = parseBody(bodyText.value)
  } catch (error: unknown) {
    parseError.value = getErrorMessage(error)
    return
  }

  let statusCode: number | null = null
  const startedAt = Date.now()
  loading.value = true

  try {
    const response = await useBackendFetch<unknown, DebugRequestBody, QueryRecord>(normalizedPath, {
      method: method.value,
      requiresAuth: requiresAuth.value,
      query,
      body,
      onResponse(context) {
        statusCode = context.response.status
      },
      onResponseError(context) {
        statusCode = context.response.status
      }
    })

    const durationMs = Date.now() - startedAt
    const errorMessage = response.error.value ? getErrorMessage(response.error.value) : null

    lastDurationMs.value = durationMs
    lastStatusCode.value = statusCode
    lastResponse.value = response.data.value
    lastError.value = errorMessage

    addEntry({
      method: method.value,
      path: normalizedPath,
      requiresAuth: requiresAuth.value,
      query,
      body,
      response: response.data.value,
      statusCode,
      durationMs,
      error: errorMessage
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startedAt
    const errorMessage = getErrorMessage(error)

    lastDurationMs.value = durationMs
    lastStatusCode.value = statusCode
    lastResponse.value = null
    lastError.value = errorMessage

    addEntry({
      method: method.value,
      path: normalizedPath,
      requiresAuth: requiresAuth.value,
      query,
      body,
      response: null,
      statusCode,
      durationMs,
      error: errorMessage
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UPageCard class="space-y-4">
    <UTabs
      v-model="activeTab"
      :items="tabItems"
      color="neutral"
      variant="link"
      :ui="{ trigger: 'grow' }"
      class="w-full"
    >
      <template #content="{ item }">
        <div
          v-if="item.value === 'request'"
          class="space-y-4"
        >
          <UFormField label="Method">
            <UTabs
              v-model="method"
              :items="methodItems"
              :content="false"
              color="neutral"
              variant="pill"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Path">
            <UInput
              v-model="path"
              placeholder="/subjects"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Query JSON (optional)">
            <UTextarea
              v-model="queryText"
              :rows="4"
              placeholder="{&quot;page&quot;:1,&quot;size&quot;:10}"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Body JSON (optional)">
            <UTextarea
              v-model="bodyText"
              :rows="6"
              placeholder="{&quot;name&quot;:&quot;New Subject&quot;}"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Requires auth">
            <USwitch v-model="requiresAuth" />
          </UFormField>

          <div class="flex gap-3">
            <UButton
              icon="i-lucide-play"
              :loading="loading"
              @click="executeRequest"
            >
              Execute request
            </UButton>

            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-eraser"
              @click="parseError = null"
            >
              Clear parse error
            </UButton>
          </div>

          <UAlert
            v-if="parseError"
            color="error"
            variant="soft"
            title="JSON parse error"
            :description="parseError"
          />

          <UAlert
            v-if="lastError"
            color="warning"
            variant="soft"
            title="Request error"
            :description="lastError"
          />

          <UPageCard
            v-if="lastDurationMs !== null"
            title="Last response"
            :description="`status: ${lastStatusCode ?? 'n/a'} | duration: ${lastDurationMs}ms`"
          >
            <pre class="overflow-x-auto rounded-md bg-elevated p-3 text-xs">{{ formatJson(lastResponse) }}</pre>
          </UPageCard>
        </div>

        <div
          v-else
          class="space-y-3"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-muted">
              Entries: {{ history.length }}
            </p>

            <UButton
              icon="i-lucide-trash"
              color="error"
              variant="soft"
              :disabled="history.length === 0"
              @click="clearHistory"
            >
              Clear history
            </UButton>
          </div>

          <UAlert
            v-if="history.length === 0"
            color="neutral"
            variant="soft"
            title="No requests yet"
            description="Run a request in the Request tab to see history."
          />

          <UPageCard
            v-for="entry in history"
            :key="entry.id"
            :title="`${entry.method} ${entry.path}`"
            :description="`status: ${entry.statusCode ?? 'n/a'} | ${entry.durationMs}ms | ${formatTimestamp(entry.createdAt)}`"
          >
            <div class="space-y-3 text-xs">
              <p class="text-muted">
                requiresAuth: {{ entry.requiresAuth ? 'true' : 'false' }}
              </p>

              <div>
                <p class="mb-1 font-medium text-sm">
                  Query
                </p>
                <pre class="overflow-x-auto rounded-md bg-elevated p-3">{{ formatJson(entry.query) }}</pre>
              </div>

              <div>
                <p class="mb-1 font-medium text-sm">
                  Body
                </p>
                <pre class="overflow-x-auto rounded-md bg-elevated p-3">{{ formatJson(entry.body) }}</pre>
              </div>

              <div>
                <p class="mb-1 font-medium text-sm">
                  Response
                </p>
                <pre class="overflow-x-auto rounded-md bg-elevated p-3">{{ formatJson(entry.response) }}</pre>
              </div>

              <UAlert
                v-if="entry.error"
                color="warning"
                variant="soft"
                title="Error"
                :description="entry.error"
              />
            </div>
          </UPageCard>
        </div>
      </template>
    </UTabs>
  </UPageCard>
</template>
