import type {
  TeacherResponse,
  UpdateTeacherRequest
} from '#shared/types/backend'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useTeachersApi() {
  const createOrUpdate = (id: string, payload: UpdateTeacherRequest) => {
    return useBackendFetch<TeacherResponse, UpdateTeacherRequest>(`/teachers/${id}`, {
      method: 'PUT',
      body: payload
    })
  }

  return {
    createOrUpdate
  }
}
