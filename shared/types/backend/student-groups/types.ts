interface CreateGroupRequest {
  groupName: string
  studentNames: string[][]
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

interface GroupSubjectResponse {
  id: string
  name: string
}

interface StudentGroupResponse {
  id: string
  name: string
  subjects: GroupSubjectResponse[]
  students: StudentEntryResponse[]
  subgroups: SubgroupResponse[]
}

interface SubgroupResponse {
  id: string
  name: string
  students: StudentEntryResponse[]
}

interface FindGroupsFilter {
  name?: string
}

interface UpdateGroupRequest {
  name: string
}

export type {
  CreateGroupRequest,
  FindGroupsFilter,
  GroupSubjectResponse,
  StudentEntryResponse,
  StudentGroupPageResponse,
  StudentGroupResponse,
  SubgroupResponse,
  UpdateGroupRequest,
}
