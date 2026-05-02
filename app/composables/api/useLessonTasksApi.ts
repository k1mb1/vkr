import type {
  CreateTaskRequestPayload,
  LessonTaskGradesResponse,
  TaskGradeResponse,
  TaskResponse,
  UpdateTaskRequestPayload,
  UpsertTaskGradeRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult, BackendResult } from '~/composables/useBackendFetch'
import { toValue } from 'vue'
import { $backendFetch, useBackendFetch } from '~/composables/useBackendFetch'

export function useLessonTasks(
  lessonId: MaybeRefOrGetter<string>,
): BackendFetchResult<TaskResponse[]> {
  return useBackendFetch<TaskResponse[]>(() => `/lessons/${toValue(lessonId)}/tasks`, {
    method: 'GET',
  })
}

export function useLessonTaskGrades(
  lessonId: MaybeRefOrGetter<string>,
): BackendFetchResult<LessonTaskGradesResponse> {
  return useBackendFetch<LessonTaskGradesResponse>(
    () => `/lessons/${toValue(lessonId)}/tasks/grades`,
    { method: 'GET' },
  )
}

export function createLessonTask(
  lessonId: MaybeRefOrGetter<string>,
  payload: CreateTaskRequestPayload,
): Promise<BackendResult<TaskResponse>> {
  return $backendFetch<TaskResponse>(`/lessons/${toValue(lessonId)}/tasks`, {
    method: 'POST',
    body: payload,
  })
}

export function updateLessonTask(
  lessonId: MaybeRefOrGetter<string>,
  taskId: MaybeRefOrGetter<string>,
  payload: UpdateTaskRequestPayload,
): Promise<BackendResult<TaskResponse>> {
  return $backendFetch<TaskResponse>(
    `/lessons/${toValue(lessonId)}/tasks/${toValue(taskId)}`,
    { method: 'PATCH', body: payload },
  )
}

export function deleteLessonTask(
  lessonId: MaybeRefOrGetter<string>,
  taskId: MaybeRefOrGetter<string>,
): Promise<BackendResult<void>> {
  return $backendFetch<void>(
    `/lessons/${toValue(lessonId)}/tasks/${toValue(taskId)}`,
    { method: 'DELETE' },
  )
}

export function upsertLessonTaskGrade(
  lessonId: MaybeRefOrGetter<string>,
  taskId: MaybeRefOrGetter<string>,
  payload: UpsertTaskGradeRequestPayload,
): Promise<BackendResult<TaskGradeResponse>> {
  return $backendFetch<TaskGradeResponse>(
    `/lessons/${toValue(lessonId)}/tasks/${toValue(taskId)}/grades`,
    { method: 'PUT', body: payload },
  )
}

export function upsertLessonTaskGradesBulk(
  lessonId: MaybeRefOrGetter<string>,
  taskId: MaybeRefOrGetter<string>,
  payload: UpsertTaskGradeRequestPayload[],
): Promise<BackendResult<TaskGradeResponse[]>> {
  return $backendFetch<TaskGradeResponse[]>(
    `/lessons/${toValue(lessonId)}/tasks/${toValue(taskId)}/grades/bulk`,
    { method: 'PUT', body: payload },
  )
}
