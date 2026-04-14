import type {
  CreateSubjectRequest,
  SubjectResponse,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useSubjectsApi() {
  const create = (payload: MaybeRefOrGetter<CreateSubjectRequest>) => {
    return useBackendFetch<SubjectResponse, CreateSubjectRequest>(`/subjects`, {
      method: 'POST',
      body: () => toValue(payload),
    })
  }

  return {
    create,
  }
}
