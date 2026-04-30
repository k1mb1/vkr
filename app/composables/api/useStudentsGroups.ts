import type {
  CreateGroupRequestPayload,
  FindGroupsFilter,
  PageQuery,
  PageRequest,
  PageResponse,
  StudentGroupPageResponse,
  StudentGroupResponse,
  UpdateGroupRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import {
  createGroupRequestSchema,
  DEFAULT_PAGE_REQUEST,
  toPageQuery,
  updateGroupRequestSchema,
} from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useStudentsGroupsApi() {
  const findAll = (
    request: MaybeRefOrGetter<PageRequest<FindGroupsFilter>> = DEFAULT_PAGE_REQUEST,
  ): BackendFetchResult<PageResponse<StudentGroupPageResponse>> => {
    return useBackendFetch<PageResponse<StudentGroupPageResponse>, undefined, PageQuery>(`/groups`, {
      method: 'GET',
      query: () => toPageQuery(toValue(request)),
    })
  }

  const create = (
    payload: MaybeRefOrGetter<CreateGroupRequestPayload>,
  ): BackendFetchResult<StudentGroupResponse> => {
    return useBackendFetch<StudentGroupResponse, CreateGroupRequestPayload>(`/groups`, {
      method: 'POST',
      body: () => toValue(payload),
      bodySchema: createGroupRequestSchema,
    })
  }

  const findById = (
    groupId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<StudentGroupResponse> => {
    return useBackendFetch<StudentGroupResponse, undefined>(() => `/groups/${toValue(groupId)}`, {
      method: 'GET',
    })
  }

  const update = (
    groupId: MaybeRefOrGetter<string>,
    payload: MaybeRefOrGetter<UpdateGroupRequestPayload>,
  ): BackendFetchResult<StudentGroupResponse> => {
    return useBackendFetch<StudentGroupResponse, UpdateGroupRequestPayload>(
      () => `/groups/${toValue(groupId)}`,
      {
        method: 'PATCH',
        body: () => toValue(payload),
        bodySchema: updateGroupRequestSchema,
      },
    )
  }

  const remove = (
    groupId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<undefined> => {
    return useBackendFetch<undefined, null>(() => `/groups/${toValue(groupId)}`, {
      method: 'DELETE',
      body: null,
    })
  }

  return {
    findAll,
    create,
    findById,
    update,
    remove,
  }
}
