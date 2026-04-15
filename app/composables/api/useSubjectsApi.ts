import type {
  CreateSubjectRequestPayload,
  FindSubjectsFilter,
  SubjectResponse,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import { createSubjectRequestSchema } from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useSubjectsApi() {
  const create = (
    payload: MaybeRefOrGetter<CreateSubjectRequestPayload>,
  ): BackendFetchResult<SubjectResponse> => {
    return useBackendFetch<SubjectResponse, CreateSubjectRequestPayload>(`/subjects`, {
      method: 'POST',
      body: () => toValue(payload),
      bodySchema: createSubjectRequestSchema,
    })
  }

  const findAllByTeacherId = (
    teacherId: MaybeRefOrGetter<string>,
    filter?: MaybeRefOrGetter<FindSubjectsFilter>,
  ): BackendFetchResult<SubjectResponse[]> => {
    return useBackendFetch<SubjectResponse[], undefined, FindSubjectsFilter>(
      () => `/subjects/teachers/${toValue(teacherId)}`,
      {
        method: 'GET',
        query: () => toValue(filter),
      },
    )
  }

  return {
    create,
    findAllByTeacherId,
  }
}
