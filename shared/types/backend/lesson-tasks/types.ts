interface TaskResponse {
  id: string
  lessonId: string
  title: string
  description: string | null
  maxPoints: number
  position: number
  isMandatory: boolean
  deadline: string | null
  createdAt: string
  updatedAt: string
}

interface CreateTaskRequest {
  title: string
  description?: string | null
  maxPoints: number
  position: number
  isMandatory: boolean
  deadline?: string
}

interface UpdateTaskRequest {
  title?: string
  description?: string | null
  maxPoints?: number
  position?: number
  isMandatory?: boolean
  deadline?: string
}

export type {
  CreateTaskRequest,
  TaskResponse,
  UpdateTaskRequest,
}
