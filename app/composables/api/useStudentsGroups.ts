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
import type { BackendFetchResult, BackendResult } from '~/composables/useBackendFetch'
import { DEFAULT_PAGE_REQUEST, toPageQuery } from '#shared/types/backend'
import { toValue } from 'vue'
import { $backendFetch, useBackendFetch } from '~/composables/useBackendFetch'

export function useStudentGroups(
  request: MaybeRefOrGetter<PageRequest<FindGroupsFilter>> = DEFAULT_PAGE_REQUEST,
): BackendFetchResult<PageResponse<StudentGroupPageResponse>> {
  return useBackendFetch<PageResponse<StudentGroupPageResponse>>(`/groups`, {
    method: 'GET',
    query: () => toPageQuery(toValue(request)) as PageQuery,
  })
}

export function useStudentGroup(
  groupId: MaybeRefOrGetter<string>,
): BackendFetchResult<StudentGroupResponse> {
  return useBackendFetch<StudentGroupResponse>(() => `/groups/${toValue(groupId)}`, {
    method: 'GET',
  })
}

export function createStudentGroup(
  payload: CreateGroupRequestPayload,
): Promise<BackendResult<StudentGroupResponse>> {
  return $backendFetch<StudentGroupResponse>(`/groups`, { method: 'POST', body: payload })
}

export function updateStudentGroup(
  groupId: MaybeRefOrGetter<string>,
  payload: UpdateGroupRequestPayload,
): Promise<BackendResult<StudentGroupResponse>> {
  return $backendFetch<StudentGroupResponse>(`/groups/${toValue(groupId)}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteStudentGroup(
  groupId: MaybeRefOrGetter<string>,
): Promise<BackendResult<void>> {
  return $backendFetch<void>(`/groups/${toValue(groupId)}`, { method: 'DELETE' })
}
