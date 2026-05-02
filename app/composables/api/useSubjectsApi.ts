import type {
  AttachGroupToSubjectResponse,
  CreateSubjectRequestPayload,
  FinalGradeResponse,
  FindSubjectsFilter,
  SubjectAttendanceFilter,
  SubjectAttendanceResponse,
  SubjectGradesFilter,
  SubjectGradesResponse,
  SubjectResponse,
  UpdateSubjectRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type {
  BackendFetchOptions,
  BackendFetchResult,
  BackendResult,
} from '~/composables/useBackendFetch'
import { DEFAULT_FIND_SUBJECTS_FILTER } from '#shared/types/backend'
import { toValue } from 'vue'
import { $backendFetch, useBackendFetch } from '~/composables/useBackendFetch'

type FindSubjectsByTeacherOptions = Omit<BackendFetchOptions<SubjectResponse[]>, 'method' | 'query'>

export function useSubjectsByTeacher(
  teacherId: MaybeRefOrGetter<string>,
  filter: MaybeRefOrGetter<FindSubjectsFilter> = DEFAULT_FIND_SUBJECTS_FILTER,
  options?: FindSubjectsByTeacherOptions,
): BackendFetchResult<SubjectResponse[]> {
  return useBackendFetch<SubjectResponse[]>(
    () => `/subjects/teachers/${toValue(teacherId)}`,
    {
      ...(options ?? {}),
      method: 'GET',
      query: () => toValue(filter),
    },
  )
}

export function useSubjectGrades(
  subjectId: MaybeRefOrGetter<string>,
  filter?: MaybeRefOrGetter<SubjectGradesFilter>,
): BackendFetchResult<SubjectGradesResponse> {
  return useBackendFetch<SubjectGradesResponse>(
    () => `/subjects/${toValue(subjectId)}/grades`,
    {
      method: 'GET',
      query: () => filter ? toValue(filter) : undefined,
    },
  )
}

export function useSubjectFinalGrades(
  subjectId: MaybeRefOrGetter<string>,
): BackendFetchResult<FinalGradeResponse[]> {
  return useBackendFetch<FinalGradeResponse[]>(
    () => `/subjects/${toValue(subjectId)}/final-grades`,
    { method: 'GET' },
  )
}

export function useSubjectAttendance(
  subjectId: MaybeRefOrGetter<string>,
  filter?: MaybeRefOrGetter<SubjectAttendanceFilter>,
): BackendFetchResult<SubjectAttendanceResponse> {
  return useBackendFetch<SubjectAttendanceResponse>(
    () => `/subjects/${toValue(subjectId)}/attendance`,
    {
      method: 'GET',
      query: () => filter ? toValue(filter) : undefined,
    },
  )
}

export function createSubject(
  payload: CreateSubjectRequestPayload,
): Promise<BackendResult<SubjectResponse>> {
  return $backendFetch<SubjectResponse>(`/subjects`, { method: 'POST', body: payload })
}

export function updateSubject(
  subjectId: MaybeRefOrGetter<string>,
  payload: UpdateSubjectRequestPayload,
): Promise<BackendResult<SubjectResponse>> {
  return $backendFetch<SubjectResponse>(`/subjects/${toValue(subjectId)}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteSubject(
  subjectId: MaybeRefOrGetter<string>,
): Promise<BackendResult<void>> {
  return $backendFetch<void>(`/subjects/${toValue(subjectId)}`, { method: 'DELETE' })
}

export function attachGroupToSubject(
  subjectId: MaybeRefOrGetter<string>,
  groupId: MaybeRefOrGetter<string>,
): Promise<BackendResult<AttachGroupToSubjectResponse>> {
  return $backendFetch<AttachGroupToSubjectResponse>(
    `/subjects/${toValue(subjectId)}/groups/${toValue(groupId)}`,
    { method: 'POST' },
  )
}
