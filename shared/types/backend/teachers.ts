interface CreateTeacherRequest {
  id: string
  username: string
  email: string
}

interface UpdateTeacherRequest {
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
  CreateTeacherRequest,
  UpdateTeacherRequest,
  TeacherResponse
}
