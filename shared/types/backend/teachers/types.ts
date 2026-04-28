interface CreateOrUpdateTeacherRequest {
  username?: string | null
  email?: string | null
}

interface TeacherResponse {
  id: string
  username: string
  email: string
  createdAt: string
  updatedAt: string
}

export type {
  TeacherResponse,
  CreateOrUpdateTeacherRequest,
}
