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
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import {
  bulkScheduleRequestSchema,
  createLessonRequestSchema,
  DEFAULT_PAGE_REQUEST,
  toPageQuery,
  updateIssuedTaskIndexRequestSchema,
  updateLessonRequestSchema,
} from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useLessonsApi() {
  const findAll = (
    request: MaybeRefOrGetter<PageRequest<FindLessonsFilter>> = DEFAULT_PAGE_REQUEST,
  ): BackendFetchResult<PageResponse<LessonResponse>> => {
    return useBackendFetch<PageResponse<LessonResponse>, undefined, PageQuery>(
      `/lessons`,
      {
        method: 'GET',
        query: () => toPageQuery(toValue(request)),
      },
    )
  }

  const create = (
    request: MaybeRefOrGetter<CreateLessonRequestPayload>,
  ): BackendFetchResult<LessonResponse> => {
    return useBackendFetch<LessonResponse, CreateLessonRequestPayload>(`/lessons`, {
      method: 'POST',
      body: () => toValue(request),
      bodySchema: createLessonRequestSchema,
    })
  }

  const createBulkSchedule = (
    request: MaybeRefOrGetter<BulkScheduleRequestPayload>,
  ): BackendFetchResult<LessonResponse[]> => {
    return useBackendFetch<LessonResponse[], BulkScheduleRequestPayload>(`/lessons/bulk-schedule`, {
      method: 'POST',
      body: () => toValue(request),
      bodySchema: bulkScheduleRequestSchema,
    })
  }

  const update = (
    lessonId: MaybeRefOrGetter<string>,
    request: MaybeRefOrGetter<UpdateLessonRequestPayload>,
  ): BackendFetchResult<LessonResponse> => {
    return useBackendFetch<LessonResponse, UpdateLessonRequestPayload>(
      () => `/lessons/${toValue(lessonId)}`,
      {
        method: 'PATCH',
        body: () => toValue(request),
        bodySchema: updateLessonRequestSchema,
      },
    )
  }

  const updateIssuedTaskIndex = (
    lessonId: MaybeRefOrGetter<string>,
    request: MaybeRefOrGetter<UpdateIssuedTaskIndexRequestPayload>,
  ): BackendFetchResult<LessonResponse> => {
    return useBackendFetch<LessonResponse, UpdateIssuedTaskIndexRequestPayload>(
      () => `/lessons/${toValue(lessonId)}/issued-task-index`,
      {
        method: 'PATCH',
        body: () => toValue(request),
        bodySchema: updateIssuedTaskIndexRequestSchema,
      },
    )
  }

  const issue = (
    lessonId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<LessonResponse> => {
    return useBackendFetch<LessonResponse, null>(() => `/lessons/${toValue(lessonId)}/issue`, {
      method: 'POST',
      body: null,
    })
  }

  const remove = (
    lessonId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<undefined> => {
    return useBackendFetch<undefined, null>(() => `/lessons/${toValue(lessonId)}`, {
      method: 'DELETE',
      body: null,
    })
  }

  return {
    create,
    createBulkSchedule,
    findAll,
    issue,
    remove,
    update,
    updateIssuedTaskIndex,
  }
}
