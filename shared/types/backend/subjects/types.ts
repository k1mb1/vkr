interface SubjectResponse {
  id: string
  name: string
  description: string | null
  archived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

interface AttachGroupToSubjectResponse {
  subjectId: string
  subjectName: string
  groupId: string
  groupName: string
  addedStudentsCount: number
  totalStudentsInSubject: number
}

interface FinalGradeResponse {
  studentId: string
  username: string
  earnedPoints: number
  maxPoints: number
  percentage: number | null
}

interface CreateSubjectRequest {
  name: string
  description?: string
  teacherId: string
}

interface FindSubjectsFilter {
  archived?: boolean
}

interface UpdateSubjectRequest {
  name: string
  description?: string | null
}

const DEFAULT_FIND_SUBJECTS_FILTER: FindSubjectsFilter = {
  archived: false,
}

export type {
  AttachGroupToSubjectResponse,
  CreateSubjectRequest,
  FinalGradeResponse,
  FindSubjectsFilter,
  SubjectResponse,
  UpdateSubjectRequest,
}

export {
  DEFAULT_FIND_SUBJECTS_FILTER,
}
