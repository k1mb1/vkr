import type { components } from '#open-fetch-schemas/backend'

type SubjectTeachingRowResponse = components['schemas']['SubjectTeachingRowResponse']

export type TeachingEditState = SubjectTeachingRowResponse

export function useTeachingEditState() {
  return useState<TeachingEditState | undefined>('teaching-edit', () => undefined)
}
