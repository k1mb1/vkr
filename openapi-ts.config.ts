import { defineConfig } from '@hey-api/openapi-ts'

// https://heyapi.dev/docs/openapi/typescript/configuration
// baseUrl клиента задаётся в app/plugins/api.ts (запросы идут через /api/proxy).
export default defineConfig({
  input: './openapi/api-docs.json',
  output: '.nuxt/client',
  plugins: [
    '@hey-api/client-ofetch',
    'valibot',
    { name: '@hey-api/sdk', validator: true },
  ],
})
