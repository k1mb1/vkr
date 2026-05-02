import type {
  AttendanceEntryResponse,
  SubjectAttendanceResponse,
  UpsertAttendanceRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult, BackendResult } from '~/composables/useBackendFetch'
import { toValue } from 'vue'
import { $backendFetch, useBackendFetch } from '~/composables/useBackendFetch'

export function useAttendanceBySubject(
  subjectId: MaybeRefOrGetter<string>,
): BackendFetchResult<SubjectAttendanceResponse> {
  return useBackendFetch<SubjectAttendanceResponse>(
    () => `/subjects/${toValue(subjectId)}/attendance`,
    { method: 'GET' },
  )
}

export function upsertLessonAttendance(
  lessonId: MaybeRefOrGetter<string>,
  payload: UpsertAttendanceRequestPayload,
): Promise<BackendResult<AttendanceEntryResponse>> {
  return $backendFetch<AttendanceEntryResponse>(
    `/lessons/${toValue(lessonId)}/attendance`,
    { method: 'PUT', body: payload },
  )
}
