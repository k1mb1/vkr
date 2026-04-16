import type {
  TeacherResponse,
  UpdateTeacherRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import { updateTeacherRequestSchema } from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useTeachersApi() {
  const createOrUpdate = (
    id: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpdateTeacherRequestPayload>,
  ): BackendFetchResult<TeacherResponse> => {
    return useBackendFetch<TeacherResponse, UpdateTeacherRequestPayload>(() => `/teachers/${toValue(id)}`, {
      method: 'PUT',
      body: () => toValue(payload),
      bodySchema: updateTeacherRequestSchema,
    })
  }

  return {
    createOrUpdate,
  }
}
