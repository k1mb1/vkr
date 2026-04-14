import type {
  CreateSubjectRequestPayload,
  SubjectResponse,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import { createSubjectRequestSchema } from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useSubjectsApi() {
  const create = (payload: MaybeRefOrGetter<CreateSubjectRequestPayload>) => {
    return useBackendFetch<SubjectResponse, CreateSubjectRequestPayload>(`/subjects`, {
      method: 'POST',
      body: () => toValue(payload),
      bodySchema: createSubjectRequestSchema,
    })
  }

  return {
    create,
  }
}
