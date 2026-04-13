export interface SubjectResponse {
  id: string
  name: string
  description?: string
  archived: boolean
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface CreateSubjectRequest {
  name: string
  description?: string
  teacherId: string
}

export interface FindSubjectsFilter {
  archived: boolean
}

export interface UpdateSubjectRequest {
  name?: string
  description?: string | null
  archived?: boolean
}
