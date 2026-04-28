interface CreateOrUpdateTeacherRequest {
  username: string
  email: string
}

interface TeacherResponse {
  id: string
  username: string
  email: string
  createdAt: string
  updatedAt: string
}

export type {
  CreateOrUpdateTeacherRequest,
  TeacherResponse,
}
