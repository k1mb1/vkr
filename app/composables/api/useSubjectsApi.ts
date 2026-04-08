import {
  DEFAULT_PAGE_REQUEST,
  toPageQuery,
  type CreateSubjectRequest,
  type Subject,
  type SubjectsPageRequest,
  type SubjectsPageResponse,
  type UpdateSubjectRequest
} from '#shared/types/backend'
import { useBackendFetch } from '~/composables/useBackendFetch'

export function useSubjectsApi() {
  const list = (request: SubjectsPageRequest = DEFAULT_PAGE_REQUEST) => {
    return useBackendFetch<SubjectsPageResponse>('/subjects', {
      method: 'GET',
      query: toPageQuery(request)
    })
  }

  const getById = (id: string) => {
    return useBackendFetch<Subject>(`/subjects/${id}`, {
      method: 'GET'
    })
  }

  const create = (payload: CreateSubjectRequest) => {
    return useBackendFetch<Subject, CreateSubjectRequest>(`/subjects`, {
      method: 'POST',
      body: payload
    })
  }

  const update = (id: string, payload: UpdateSubjectRequest) => {
    return useBackendFetch<Subject, UpdateSubjectRequest>(`/subjects/${id}`, {
      method: 'PATCH',
      body: payload
    })
  }

  const remove = (id: string) => {
    return useBackendFetch<unknown>(`/subjects/${id}`, {
      method: 'DELETE'
    })
  }

  return {
    list,
    getById,
    create,
    update,
    remove
  }
}
