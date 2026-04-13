import type {
  CreateSubjectRequest,
  SubjectResponse
} from '#shared/types/backend'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useSubjectsApi() {
  const create = (payload: CreateSubjectRequest) => {
    return useBackendFetch<SubjectResponse, CreateSubjectRequest>(`/subjects`, {
      method: 'POST',
      body: payload
    })
  }

  return {
    create
  }
}
