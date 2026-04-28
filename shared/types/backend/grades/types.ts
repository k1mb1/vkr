const SUBMISSION_STATUSES = [
  'NOT_SUBMITTED',
  'SUBMITTED',
  'GRADED',
  'RESUBMIT',
] as const

type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

interface UpsertTaskGradeRequest {
  studentId: string
  value?: number | null
  comment?: string | null
  status: SubmissionStatus
  submittedAt?: string
}

interface TaskGradeResponse {
  id: string
  taskId: string
  lessonId: string
  studentId: string
  value: number | null
  comment: string | null
  status: SubmissionStatus
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

interface StudentTaskGradesResponse {
  studentId: string
  username: string
  grades: TaskGradeResponse[]
}

export type {
  StudentTaskGradesResponse,
  SubmissionStatus,
  TaskGradeResponse,
  UpsertTaskGradeRequest,
}

export {
  SUBMISSION_STATUSES,
}
