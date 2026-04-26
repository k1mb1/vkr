import type {
  CreateTaskRequestPayload,
  StudentTaskGradesResponse,
  TaskGradeResponse,
  TaskResponse,
  UpdateTaskRequestPayload,
  UpsertTaskGradeRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
  upsertTaskGradeRequestSchema,
} from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useLessonTasksApi() {
  const findAll = (
    lessonId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<TaskResponse[]> => {
    return useBackendFetch<TaskResponse[], undefined>(() => `/lessons/${toValue(lessonId)}/tasks`, {
      method: 'GET',
    })
  }

  const create = (
    lessonId: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<CreateTaskRequestPayload>,
  ): BackendFetchResult<TaskResponse> => {
    return useBackendFetch<TaskResponse, CreateTaskRequestPayload>(
      () => `/lessons/${toValue(lessonId)}/tasks`,
      {
        method: 'POST',
        body: () => toValue(payload),
        bodySchema: createTaskRequestSchema,
      },
    )
  }

  const update = (
    lessonId: MaybeRefOrGetter<string>,
    taskId: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpdateTaskRequestPayload>,
  ): BackendFetchResult<TaskResponse> => {
    return useBackendFetch<TaskResponse, UpdateTaskRequestPayload>(
      () => `/lessons/${toValue(lessonId)}/tasks/${toValue(taskId)}`,
      {
        method: 'PATCH',
        body: () => toValue(payload),
        bodySchema: updateTaskRequestSchema,
      },
    )
  }

  const remove = (
    lessonId: MaybeRefOrGetter<string>,
    taskId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<undefined> => {
    return useBackendFetch<undefined, null>(() => `/lessons/${toValue(lessonId)}/tasks/${toValue(taskId)}`, {
      method: 'DELETE',
      body: null,
    })
  }

  const findGrades = (
    lessonId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<StudentTaskGradesResponse[]> => {
    return useBackendFetch<StudentTaskGradesResponse[], undefined>(
      () => `/lessons/${toValue(lessonId)}/tasks/grades`,
      {
        method: 'GET',
      },
    )
  }

  const upsertGrade = (
    lessonId: MaybeRefOrGetter<string>,
    taskId: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpsertTaskGradeRequestPayload>,
  ): BackendFetchResult<TaskGradeResponse> => {
    return useBackendFetch<TaskGradeResponse, UpsertTaskGradeRequestPayload>(
      () => `/lessons/${toValue(lessonId)}/tasks/${toValue(taskId)}/grades`,
      {
        method: 'PUT',
        body: () => toValue(payload),
        bodySchema: upsertTaskGradeRequestSchema,
      },
    )
  }

  const upsertGradesBulk = (
    lessonId: MaybeRefOrGetter<string>,
    taskId: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpsertTaskGradeRequestPayload[]>,
  ): BackendFetchResult<TaskGradeResponse[]> => {
    return useBackendFetch<TaskGradeResponse[], UpsertTaskGradeRequestPayload[]>(
      () => `/lessons/${toValue(lessonId)}/tasks/${toValue(taskId)}/grades/bulk`,
      {
        method: 'PUT',
        body: () => toValue(payload),
      },
    )
  }

  return {
    create,
    findAll,
    findGrades,
    remove,
    update,
    upsertGrade,
    upsertGradesBulk,
  }
}
