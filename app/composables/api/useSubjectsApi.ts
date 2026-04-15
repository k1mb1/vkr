import type {
  CreateSubjectRequestPayload,
  FindSubjectsFilter,
  SubjectResponse,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type {
  BackendFetchOptions,
  BackendFetchResult,
} from '~/composables/useBackendFetch'
import { createSubjectRequestSchema, DEFAULT_FIND_SUBJECTS_FILTER } from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useSubjectsApi() {
  type FindAllByTeacherIdOptions = Omit<
    BackendFetchOptions<SubjectResponse[], undefined, FindSubjectsFilter>,
    'method' | 'query'
  >

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
    options?: FindAllByTeacherIdOptions,
  ): BackendFetchResult<SubjectResponse[]> => {
    return useBackendFetch<SubjectResponse[], undefined, FindSubjectsFilter>(
      () => `/subjects/teachers/${toValue(teacherId)}`,
      {
        ...(options ?? {}),
        method: 'GET',
        query: () => ({
          ...DEFAULT_FIND_SUBJECTS_FILTER,
          ...(toValue(filter) ?? {}),
        }),
      },
    )
  }

  return {
    create,
    findAllByTeacherId,
  }
}
