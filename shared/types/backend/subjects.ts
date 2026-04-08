import type { PageRequest, PageResponse } from '#shared/types/backend/pagable'

export interface Subject {
  id: string
  code: string
  name: string
  description?: string | null
  active: boolean
}

export interface SubjectFilter {
  search?: string
  active?: boolean
}

export type SubjectsPageRequest = PageRequest<SubjectFilter>
export type SubjectsPageResponse = PageResponse<Subject>

export interface CreateSubjectRequest {
  code: string
  name: string
  description?: string | null
}

export interface UpdateSubjectRequest {
  name?: string
  description?: string | null
  active?: boolean
}
