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

interface SubjectLessonHeader {
  lessonId: string
  lessonName: string
  dateTime: string | null
  type: 'LECTURE' | 'PRACTICE' | 'NONE'
  groupId: string | null
}

interface SubjectStudentBrief {
  id: string
  username: string
}

interface SubjectGradesResponse {
  lessons: SubjectLessonHeader[]
  students: SubjectStudentBrief[]
  grades: import('#shared/types/backend/grades').TaskGradeResponse[]
}

interface CreateSubjectRequest {
  name: string
  description: string | null
  teacherId: string
}

interface FindSubjectsFilter {
  archived?: boolean
}

interface UpdateSubjectRequest {
  name?: string
  description?: string | null
  archived?: boolean
  archivedAt?: string | null
}

const DEFAULT_FIND_SUBJECTS_FILTER: FindSubjectsFilter = {
  archived: false,
}

export type {
  AttachGroupToSubjectResponse,
  CreateSubjectRequest,
  FinalGradeResponse,
  FindSubjectsFilter,
  SubjectGradesResponse,
  SubjectLessonHeader,
  SubjectResponse,
  SubjectStudentBrief,
  UpdateSubjectRequest,
}

export {
  DEFAULT_FIND_SUBJECTS_FILTER,
}
