interface StudentResponse {
  id: string
  username: string
  groupId: string | null
  createdAt: string
  updatedAt: string
}

interface StudentSubjectSubgroup {
  id: string
  name: string
  students: string[]
}

interface StudentSubjectSubgroupsResponse {
  subjectId: string
  subjectName: string
  subgroups: StudentSubjectSubgroup[]
}

interface CreateStudentRequest {
  username: string
  groupId?: string | null
}

interface UpdateStudentRequest {
  username?: string
  groupId?: string | null
}

interface FindStudentsFilter {
  username?: string
  groupId?: string
}

export type {
  CreateStudentRequest,
  FindStudentsFilter,
  StudentResponse,
  StudentSubjectSubgroup,
  StudentSubjectSubgroupsResponse,
  UpdateStudentRequest,
}
