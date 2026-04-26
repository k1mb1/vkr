import type {
  FindStudentsFilter,
  PageQuery,
  PageRequest,
  PageResponse,
  StudentResponse,
  StudentSubjectSubgroupsResponse,
  UpdateStudentRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import {
  DEFAULT_PAGE_REQUEST,
  toPageQuery,
  updateStudentRequestSchema,
} from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useStudentsApi() {
  const findAll = (
    request: MaybeRefOrGetter<PageRequest<FindStudentsFilter>> = DEFAULT_PAGE_REQUEST,
  ): BackendFetchResult<PageResponse<StudentResponse>> => {
    return useBackendFetch<PageResponse<StudentResponse>, undefined, PageQuery>(`/students`, {
      method: 'GET',
      query: () => toPageQuery(toValue(request)),
    })
  }

  const findById = (
    studentId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<StudentResponse> => {
    return useBackendFetch<StudentResponse, undefined>(() => `/students/${toValue(studentId)}`, {
      method: 'GET',
    })
  }

  const update = (
    studentId: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpdateStudentRequestPayload>,
  ): BackendFetchResult<StudentResponse> => {
    return useBackendFetch<StudentResponse, UpdateStudentRequestPayload>(
      () => `/students/${toValue(studentId)}`,
      {
        method: 'PUT',
        body: () => toValue(payload),
        bodySchema: updateStudentRequestSchema,
      },
    )
  }

  const remove = (
    studentId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<undefined> => {
    return useBackendFetch<undefined, null>(() => `/students/${toValue(studentId)}`, {
      method: 'DELETE',
      body: null,
    })
  }

  const findSubjectSubgroups = (
    subjectId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<StudentSubjectSubgroupsResponse> => {
    return useBackendFetch<StudentSubjectSubgroupsResponse, undefined>(
      () => `/students/subjects/${toValue(subjectId)}`,
      {
        method: 'GET',
      },
    )
  }

  return {
    delete: remove,
    findAll,
    findById,
    findSubjectSubgroups,
    remove,
    update,
  }
}
