import type {
  BulkScheduleRequestPayload,
  CreateLessonRequestPayload,
  CreateLessonsByTypeRequestPayload,
  LessonResponse,
  UpdateDecayFactorRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import {
  bulkScheduleRequestSchema,
  createLessonRequestSchema,
  createLessonsByTypeRequestSchema,
  updateDecayFactorRequestSchema,
} from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useLessonsApi() {
  const findAllBySubjectId = (
    subjectId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<LessonResponse[]> => {
    return useBackendFetch<LessonResponse[], undefined, { subjectId: string }>(
      `/lessons`,
      {
        method: 'GET',
        query: () => ({ subjectId: toValue(subjectId) }),
      },
    )
  }

  const create = (
    payload: MaybeRefOrGetter<CreateLessonRequestPayload>,
  ): BackendFetchResult<LessonResponse> => {
    return useBackendFetch<LessonResponse, CreateLessonRequestPayload>(`/lessons`, {
      method: 'POST',
      body: () => toValue(payload),
      bodySchema: createLessonRequestSchema,
    })
  }

  const createBulkByType = (
    payload: MaybeRefOrGetter<CreateLessonsByTypeRequestPayload>,
  ): BackendFetchResult<LessonResponse[]> => {
    return useBackendFetch<LessonResponse[], CreateLessonsByTypeRequestPayload>(`/lessons/bulk-by-type`, {
      method: 'POST',
      body: () => toValue(payload),
      bodySchema: createLessonsByTypeRequestSchema,
    })
  }

  const createBulkSchedule = (
    payload: MaybeRefOrGetter<BulkScheduleRequestPayload>,
  ): BackendFetchResult<LessonResponse[]> => {
    return useBackendFetch<LessonResponse[], BulkScheduleRequestPayload>(`/lessons/bulk-schedule`, {
      method: 'POST',
      body: () => toValue(payload),
      bodySchema: bulkScheduleRequestSchema,
    })
  }

  const updateDecayFactor = (
    lessonId: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpdateDecayFactorRequestPayload>,
  ): BackendFetchResult<LessonResponse> => {
    return useBackendFetch<LessonResponse, UpdateDecayFactorRequestPayload>(
      () => `/lessons/${toValue(lessonId)}/decay-factor`,
      {
        method: 'PATCH',
        body: () => toValue(payload),
        bodySchema: updateDecayFactorRequestSchema,
      },
    )
  }

  return {
    create,
    createBulkByType,
    createBulkSchedule,
    findAllBySubjectId,
    updateDecayFactor,
  }
}
