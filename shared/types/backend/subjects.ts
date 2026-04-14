interface SubjectResponse {
  id: string
  name: string
  description?: string
  archived: boolean
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

interface CreateSubjectRequest {
  name: string
  description?: string
  teacherId: string
}

interface FindSubjectsFilter {
  archived: boolean
}

interface UpdateSubjectRequest {
  name?: string
  description?: string | null
  archived?: boolean
}

export type {
  SubjectResponse,
  CreateSubjectRequest,
  FindSubjectsFilter,
  UpdateSubjectRequest
}
