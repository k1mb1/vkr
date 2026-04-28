import type {
  AttachGroupToSubjectResponse,
  CreateSubjectRequestPayload,
  FinalGradeResponse,
  FindSubjectsFilter,
  SubjectAttendanceResponse,
  SubjectGradesResponse,
  StudentGroupPageResponse,
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

  const findGroups = (
    subjectId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<StudentGroupPageResponse[]> => {
    return useBackendFetch<StudentGroupPageResponse[], undefined>(
      () => `/subjects/${toValue(subjectId)}/groups`,
      { method: 'GET' },
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

  const detachGroup = (
    subjectId: MaybeRefOrGetter<string>,
    groupId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<undefined> => {
    return useBackendFetch<undefined, null>(
      () => `/subjects/${toValue(subjectId)}/groups/${toValue(groupId)}`,
      { method: 'DELETE', body: null },
    )
  }

  const findGrades = (
    subjectId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<SubjectGradesResponse> => {
    return useBackendFetch<SubjectGradesResponse, undefined>(
      () => `/subjects/${toValue(subjectId)}/grades`,
      { method: 'GET' },
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
  ): BackendFetchResult<SubjectAttendanceResponse> => {
    return useBackendFetch<SubjectAttendanceResponse, undefined>(
      () => `/subjects/${toValue(subjectId)}/attendance`,
      { method: 'GET' },
    )
  }

  return {
    attachGroup,
    create,
    detachGroup,
    findAttendance,
    findAllByTeacherId,
    findFinalGrades,
    findGrades,
    findGroups,
    remove,
    update,
  }
}
