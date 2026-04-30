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
} from '~/composables/useBackendFetch'
import { createSubjectRequestSchema, DEFAULT_FIND_SUBJECTS_FILTER, updateSubjectRequestSchema } from '#shared/types/backend'
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

  const update = (
    subjectId: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpdateSubjectRequestPayload>,
  ): BackendFetchResult<SubjectResponse> => {
    return useBackendFetch<SubjectResponse, UpdateSubjectRequestPayload>(
      () => `/subjects/${toValue(subjectId)}`,
      {
        method: 'PATCH',
        body: () => toValue(payload),
        bodySchema: updateSubjectRequestSchema,
      },
    )
  }

  const remove = (
    subjectId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<undefined> => {
    return useBackendFetch<undefined, null>(
      () => `/subjects/${toValue(subjectId)}`,
      { method: 'DELETE', body: null },
    )
  }

  const findAllByTeacherId = (
    teacherId: MaybeRefOrGetter<string>,
    filter: MaybeRefOrGetter<FindSubjectsFilter> = DEFAULT_FIND_SUBJECTS_FILTER,
    options?: FindAllByTeacherIdOptions,
  ): BackendFetchResult<SubjectResponse[]> => {
    return useBackendFetch<SubjectResponse[], undefined, FindSubjectsFilter>(
      () => `/subjects/teachers/${toValue(teacherId)}`,
      {
        ...(options ?? {}),
        method: 'GET',
        query: () => toValue(filter),
      },
    )
  }

  const attachGroup = (
    subjectId: MaybeRefOrGetter<string>,
    groupId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<AttachGroupToSubjectResponse> => {
    return useBackendFetch<AttachGroupToSubjectResponse, null>(
      () => `/subjects/${toValue(subjectId)}/groups/${toValue(groupId)}`,
      { method: 'POST', body: null },
    )
  }

  const findGrades = (
    subjectId: MaybeRefOrGetter<string>,
    filter?: MaybeRefOrGetter<SubjectGradesFilter>,
  ): BackendFetchResult<SubjectGradesResponse> => {
    return useBackendFetch<SubjectGradesResponse, undefined, SubjectGradesFilter>(
      () => `/subjects/${toValue(subjectId)}/grades`,
      {
        method: 'GET',
        query: () => filter ? toValue(filter) : undefined,
      },
    )
  }

  const findFinalGrades = (
    subjectId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<FinalGradeResponse[]> => {
    return useBackendFetch<FinalGradeResponse[], undefined>(
      () => `/subjects/${toValue(subjectId)}/final-grades`,
      { method: 'GET' },
    )
  }

  const findAttendance = (
    subjectId: MaybeRefOrGetter<string>,
    filter?: MaybeRefOrGetter<SubjectAttendanceFilter>,
  ): BackendFetchResult<SubjectAttendanceResponse> => {
    return useBackendFetch<SubjectAttendanceResponse, undefined, SubjectAttendanceFilter>(
      () => `/subjects/${toValue(subjectId)}/attendance`,
      {
        method: 'GET',
        query: () => filter ? toValue(filter) : undefined,
      },
    )
  }

  return {
    attachGroup,
    create,
    findAttendance,
    findAllByTeacherId,
    findFinalGrades,
    findGrades,
    remove,
    update,
  }
}
