import type {
  AttendanceEntryResponse,
  StudentAttendanceTableResponse,
  UpsertAttendanceRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import { upsertAttendanceRequestSchema } from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useAttendanceApi() {
  const findBySubject = (
    subjectId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<StudentAttendanceTableResponse[]> => {
    return useBackendFetch<StudentAttendanceTableResponse[], undefined>(
      () => `/subjects/${toValue(subjectId)}/attendance`,
      {
        method: 'GET',
      },
    )
  }

  const upsertByLesson = (
    lessonId: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpsertAttendanceRequestPayload>,
  ): BackendFetchResult<AttendanceEntryResponse> => {
    return useBackendFetch<AttendanceEntryResponse, UpsertAttendanceRequestPayload>(
      () => `/lessons/${toValue(lessonId)}/attendance`,
      {
        method: 'PUT',
        body: () => toValue(payload),
        bodySchema: upsertAttendanceRequestSchema,
      },
    )
  }

  return {
    findBySubject,
    upsertByLesson,
  }
}
