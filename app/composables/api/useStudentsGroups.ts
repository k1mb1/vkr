import type { CreateGroupRequest, PageRequest, PageResponse, StudentGroupPageResponse, StudentGroupResponse } from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import {

  DEFAULT_PAGE_REQUEST,

  toPageQuery,
} from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useStudentsGroupsApi() {
  const findAll = (
    request: MaybeRefOrGetter<PageRequest> = DEFAULT_PAGE_REQUEST,
  ): BackendFetchResult<PageResponse<StudentGroupPageResponse>> => {
    return useBackendFetch<PageResponse<StudentGroupPageResponse>, undefined>(`/groups`, {
      method: 'GET',
      query: () => toPageQuery(toValue(request)),
    })
  }

  const create = (
    payload: MaybeRefOrGetter<CreateGroupRequest>,
  ): BackendFetchResult<StudentGroupResponse> => {
    return useBackendFetch<StudentGroupResponse, CreateGroupRequest>(`/groups`, {
      method: 'POST',
      body: () => toValue(payload),
    })
  }

  const findById = (
    groupId: MaybeRefOrGetter<string>,
  ): BackendFetchResult<StudentGroupResponse> => {
    return useBackendFetch<StudentGroupResponse, undefined>(() => `/groups/${toValue(groupId)}`, {
      method: 'GET',
    })
  }

  return {
    findAll,
    create,
    findById,
  }
}
