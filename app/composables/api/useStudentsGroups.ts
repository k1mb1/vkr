import {
  type CreateGroupRequest,
  DEFAULT_PAGE_REQUEST,
  type PageRequest,
  type PageResponse,
  type StudentGroupPageResponse,
  type StudentGroupResponse,
  toPageQuery
} from '#shared/types/backend'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useStudentsGroupsApi() {
  const findAll = (request: PageRequest = DEFAULT_PAGE_REQUEST) => {
    return useBackendFetch<PageResponse<StudentGroupPageResponse>, undefined>(`/groups`, {
      method: 'GET',
      query: toPageQuery(request)
    })
  }

  const create = (payload: CreateGroupRequest) => {
    return useBackendFetch<StudentGroupResponse, CreateGroupRequest>(`/groups`, {
      method: 'POST',
      body: payload
    })
  }

  const findById = (groupId: string) => {
    return useBackendFetch<StudentGroupResponse, undefined>(`/groups/${groupId}`, {
      method: 'GET'
    })
  }

  return {
    findAll,
    create,
    findById
  }
}
