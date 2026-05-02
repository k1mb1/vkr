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
import { DEFAULT_PAGE_REQUEST, toPageQuery } from '#shared/types/backend'
import { toValue } from 'vue'
import { $backendFetch, useBackendFetch } from '~/composables/useBackendFetch'

export function useStudents(
  request: MaybeRefOrGetter<PageRequest<FindStudentsFilter>> = DEFAULT_PAGE_REQUEST,
): BackendFetchResult<PageResponse<StudentResponse>> {
  return useBackendFetch<PageResponse<StudentResponse>>(`/students`, {
    method: 'GET',
    query: () => toPageQuery(toValue(request)) as PageQuery,
  })
}

export function useStudent(
  studentId: MaybeRefOrGetter<string>,
): BackendFetchResult<StudentResponse> {
  return useBackendFetch<StudentResponse>(() => `/students/${toValue(studentId)}`, {
    method: 'GET',
  })
}

export function createStudent(
  payload: CreateStudentRequestPayload,
): Promise<BackendResult<StudentResponse>> {
  return $backendFetch<StudentResponse>(`/students`, { method: 'POST', body: payload })
}

export function updateStudent(
  studentId: MaybeRefOrGetter<string>,
  payload: UpdateStudentRequestPayload,
): Promise<BackendResult<StudentResponse>> {
  return $backendFetch<StudentResponse>(`/students/${toValue(studentId)}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteStudent(
  studentId: MaybeRefOrGetter<string>,
): Promise<BackendResult<void>> {
  return $backendFetch<void>(`/students/${toValue(studentId)}`, { method: 'DELETE' })
}
