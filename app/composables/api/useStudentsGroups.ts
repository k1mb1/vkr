import type { CreateGroupRequestPayload, PageRequest, PageResponse, StudentGroupPageResponse, StudentGroupResponse } from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import { createGroupRequestSchema, DEFAULT_PAGE_REQUEST } from '#shared/types/backend'
import { toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useStudentsGroupsApi() {
  const findAll = (
    request: MaybeRefOrGetter<PageRequest> = DEFAULT_PAGE_REQUEST,
  ): BackendFetchResult<PageResponse<StudentGroupPageResponse>> => {
    return useBackendFetch<PageResponse<StudentGroupPageResponse>, undefined, PageRequest>(`/groups`, {
      method: 'GET',
      query: () => toValue(request),
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

  return {
    findAll,
    create,
    findById,
  }
}
