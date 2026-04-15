import type {
  TeacherResponse,
  UpdateTeacherRequest,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useTeachersApi() {
  const createOrUpdate = (
    id: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpdateTeacherRequest>,
  ): BackendFetchResult<TeacherResponse> => {
    return useBackendFetch<TeacherResponse, UpdateTeacherRequest>(() => `/teachers/${toValue(id)}`, {
      method: 'PUT',
      body: () => toValue(payload),
    })
  }

  return {
    createOrUpdate,
  }
}
