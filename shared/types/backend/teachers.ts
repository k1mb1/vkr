export interface CreateTeacherRequest {
  id: string
  username: string
  email: string
}

export interface UpdateTeacherRequest {
  username: string
  email: string
}

export interface TeacherResponse {
  id: string
  username: string
  email: string
  createdAt: string
  updatedAt: string
}
