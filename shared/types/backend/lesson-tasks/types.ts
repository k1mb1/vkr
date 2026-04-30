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
  description: string | null
  maxPoints: number
  position: number
  isMandatory: boolean
  deadline: string | null
}

interface UpdateTaskRequest {
  title?: string
  description?: string | null
  maxPoints?: number
  position?: number
  isMandatory?: boolean
  deadline?: string | null
}

interface LessonTaskGradesResponse {
  students: Array<{ id: string, username: string }>
  grades: import('#shared/types/backend/grades').TaskGradeResponse[]
}

export type {
  CreateTaskRequest,
  LessonTaskGradesResponse,
  TaskResponse,
  UpdateTaskRequest,
}
