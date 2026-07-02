import { defineConfig } from '@hey-api/openapi-ts'

// https://heyapi.dev/docs/openapi/typescript/configuration
// baseUrl клиента задаётся в app/plugins/api.ts (запросы идут через /api/proxy).
export default defineConfig({
  input: './openapi/api-docs.json',
  output: '.nuxt/client',
  plugins: [
    '@hey-api/client-ofetch',
    'valibot',
    // Валидируем только исходящий запрос. Ответы НЕ валидируем: Spring отдаёт
    // отсутствующие опциональные поля как `null` ("description": null), а
    // сгенерированный `v.optional(v.string())` принимает только `undefined`,
    // не `null` — из-за чего валидный ответ падал с
    // "Invalid type: Expected string but received null".
    { name: '@hey-api/sdk', validator: { request: 'valibot', response: false } },
  ],
})
