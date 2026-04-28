interface CreateGroupStudentEntry {
  username: string
  subgroupIndex: number | null
}

interface CreateGroupRequest {
  groupName: string
  students: CreateGroupStudentEntry[]
}

interface StudentGroupPageResponse {
  id: string
  name: string
  subgroupCount: number
}

interface StudentEntryResponse {
  id: string
  username: string
}

interface GroupStudentEntryResponse {
  id: string
  username: string
  subgroupId: string | null
}

interface GroupSubjectResponse {
  id: string
  name: string
}

interface StudentGroupResponse {
  id: string
  name: string
  subjects: GroupSubjectResponse[]
  students: GroupStudentEntryResponse[]
  subgroups: SubgroupResponse[]
}

interface SubgroupResponse {
  id: string
  name: string
  students?: StudentEntryResponse[]
}

interface FindGroupsFilter {
  name?: string
}

interface UpdateGroupRequest {
  name: string
}

export type {
  CreateGroupRequest,
  CreateGroupStudentEntry,
  FindGroupsFilter,
  GroupStudentEntryResponse,
  GroupSubjectResponse,
  StudentEntryResponse,
  StudentGroupPageResponse,
  StudentGroupResponse,
  SubgroupResponse,
  UpdateGroupRequest,
}
