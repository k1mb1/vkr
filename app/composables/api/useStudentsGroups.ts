import {
  type CreateGroupRequest,
  DEFAULT_PAGE_REQUEST,
  type PageRequest,
  type PageResponse,
  type StudentGroupPageResponse,
  type StudentGroupResponse,
  toPageQuery
} from '#shared/types/backend'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useStudentsGroupsApi() {
  const findAll = (request: MaybeRefOrGetter<PageRequest> = DEFAULT_PAGE_REQUEST) => {
    return useBackendFetch<PageResponse<StudentGroupPageResponse>, undefined>(`/groups`, {
      method: 'GET',
      query: () => toPageQuery(toValue(request))
    })
  }

  const create = (payload: MaybeRefOrGetter<CreateGroupRequest>) => {
    return useBackendFetch<StudentGroupResponse, CreateGroupRequest>(`/groups`, {
      method: 'POST',
      body: () => toValue(payload)
    })
  }

  const findById = (groupId: MaybeRefOrGetter<string>) => {
    return useBackendFetch<StudentGroupResponse, undefined>(() => `/groups/${toValue(groupId)}`, {
      method: 'GET'
    })
  }

  return {
    findAll,
    create,
    findById
  }
}
