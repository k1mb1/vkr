import type {
  CreateGroupRequestPayload,
  GroupResponse,
  PageQuery,
  PageRequest,
  PageResponse,
  StudentGroupFilterRequest,
  StudentGroupListDto,
  UpdateGroupRequestPayload,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import { toPageQuery } from '#shared/types/backend'
import { computed, toValue } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

const DEFAULT_PATH = '/student-groups'

export function useStudentGroups(
  request?: MaybeRefOrGetter<PageRequest<StudentGroupFilterRequest>>,
): BackendFetchResult<PageResponse<StudentGroupListDto>> {
  return useBackendFetch<PageResponse<StudentGroupListDto>>(`${DEFAULT_PATH}`, {
    method: 'GET',
    query: computed(() => toPageQuery(request ? toValue(request) : undefined) as PageQuery),
  })
}

export function create(
  payload: CreateGroupRequestPayload,
): Promise<BackendResult<GroupResponse>> {
  return $backendFetch<GroupResponse>(`${DEFAULT_PATH}`, { method: 'POST', body: payload })
}

export function useStudentGroup(
  groupId: MaybeRefOrGetter<string>,
): BackendFetchResult<GroupResponse> {
  return useBackendFetch<GroupResponse>(() => `${DEFAULT_PATH}/${toValue(groupId)}`, {
    method: 'GET',
  })
}

export function patch(
  groupId: MaybeRefOrGetter<string>,
  payload: UpdateGroupRequestPayload,
): Promise<BackendResult<GroupResponse>> {
  return $backendFetch<GroupResponse>(`${DEFAULT_PATH}/${toValue(groupId)}`, { method: 'PATCH', body: payload })
}

export function remove(groupId: MaybeRefOrGetter<string>): Promise<BackendResult<void>> {
  return $backendFetch<void>(`${DEFAULT_PATH}/${toValue(groupId)}`, { method: 'DELETE' })
}
