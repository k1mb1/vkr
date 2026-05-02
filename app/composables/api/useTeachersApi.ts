import type {
  TeacherResponse,
  UpdateTeacherRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendResult } from '~/composables/useBackendFetch'
import { toValue } from 'vue'
import { $backendFetch } from '~/composables/useBackendFetch'

export function upsertTeacher(
  id: MaybeRefOrGetter<string>,
  payload: UpdateTeacherRequestPayload,
): Promise<BackendResult<TeacherResponse>> {
  return $backendFetch<TeacherResponse>(`/teachers/${toValue(id)}`, {
    method: 'PUT',
    body: payload,
  })
}
