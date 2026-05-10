import type {
  BulkScheduleRequestPayload,
  CreateLessonRequestPayload,
  FindLessonsFilter,
  LessonResponse,
  PageQuery,
  PageRequest,
  PageResponse,
  UpdateIssuedTaskIndexRequestPayload,
  UpdateLessonRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult, BackendResult } from '~/composables/useBackendFetch'
import { toPageQuery } from '#shared/types/backend'
import { toValue } from 'vue'
import { $backendFetch, useBackendFetch } from '~/composables/useBackendFetch'

const DEFAULT_PATH = '/lessons'

export function useLessons(
  request?: MaybeRefOrGetter<PageRequest<FindLessonsFilter>>,
): BackendFetchResult<PageResponse<LessonResponse>> {
  return useBackendFetch<PageResponse<LessonResponse>>(`${DEFAULT_PATH}`, {
    method: 'GET',
    query: () => toPageQuery(request ? toValue(request) : undefined) as PageQuery,
  })
}

export function createLesson(
  payload: CreateLessonRequestPayload,
): Promise<BackendResult<LessonResponse>> {
  return $backendFetch<LessonResponse>(`${DEFAULT_PATH}`, { method: 'POST', body: payload })
}

export function createLessonsBulkSchedule(
  payload: BulkScheduleRequestPayload,
): Promise<BackendResult<LessonResponse[]>> {
  return $backendFetch<LessonResponse[]>(`${DEFAULT_PATH}/bulk-schedule`, { method: 'POST', body: payload })
}

export function updateLesson(
  lessonId: MaybeRefOrGetter<string>,
  payload: UpdateLessonRequestPayload,
): Promise<BackendResult<LessonResponse>> {
  return $backendFetch<LessonResponse>(`${DEFAULT_PATH}/${toValue(lessonId)}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function updateLessonIssuedTaskIndex(
  lessonId: MaybeRefOrGetter<string>,
  payload: UpdateIssuedTaskIndexRequestPayload,
): Promise<BackendResult<LessonResponse>> {
  return $backendFetch<LessonResponse>(`/lessons/${toValue(lessonId)}/issued-task-index`, {
    method: 'PATCH',
    body: payload,
  })
}

export function issueLesson(
  lessonId: MaybeRefOrGetter<string>,
): Promise<BackendResult<LessonResponse>> {
  return $backendFetch<LessonResponse>(`/lessons/${toValue(lessonId)}/issue`, { method: 'POST' })
}

export function deleteLesson(
  lessonId: MaybeRefOrGetter<string>,
): Promise<BackendResult<void>> {
  return $backendFetch<void>(`${DEFAULT_PATH}/${toValue(lessonId)}`, { method: 'DELETE' })
}
