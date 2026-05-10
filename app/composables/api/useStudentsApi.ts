import type {
  CreateStudentRequestPayload,
  FindStudentsFilter,
  PageQuery,
  PageRequest,
  PageResponse,
  StudentResponse,
  UpdateStudentRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult, BackendResult } from '~/composables/useBackendFetch'
import { toPageQuery } from '#shared/types/backend'
import { toValue } from 'vue'
import { $backendFetch, useBackendFetch } from '~/composables/useBackendFetch'

const DEFAULT_PATH = '/students'

export function useStudents(
  request?: MaybeRefOrGetter<PageRequest<FindStudentsFilter>>,
): BackendFetchResult<PageResponse<StudentResponse>> {
  return useBackendFetch<PageResponse<StudentResponse>>(`${DEFAULT_PATH}`, {
    method: 'GET',
    query: () => toPageQuery(request ? toValue(request) : undefined) as PageQuery,
  })
}

export function useStudent(
  studentId: MaybeRefOrGetter<string>,
): BackendFetchResult<StudentResponse> {
  return useBackendFetch<StudentResponse>(() => `${DEFAULT_PATH}/${toValue(studentId)}`, {
    method: 'GET',
  })
}

export function createStudent(
  payload: CreateStudentRequestPayload,
): Promise<BackendResult<StudentResponse>> {
  return $backendFetch<StudentResponse>(`${DEFAULT_PATH}`, { method: 'POST', body: payload })
}

export function updateStudent(
  studentId: MaybeRefOrGetter<string>,
  payload: UpdateStudentRequestPayload,
): Promise<BackendResult<StudentResponse>> {
  return $backendFetch<StudentResponse>(`${DEFAULT_PATH}/${toValue(studentId)}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteStudent(
  studentId: MaybeRefOrGetter<string>,
): Promise<BackendResult<void>> {
  return $backendFetch<void>(`${DEFAULT_PATH}/${toValue(studentId)}`, { method: 'DELETE' })
}
