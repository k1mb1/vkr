interface StudentGroupListDto {
  id: string
  name: string
  subgroupCount: number
  totalStudentCount: number
}

interface StudentGroupFilterRequest {
  name?: string
}

interface CreateGroupRequest {
  groupName: string
  students: Array<{
    username: string
    subgroupIndex: number | null
  }>
}

interface GroupResponse {
  id: string
  name: string
  subgroups: Array<{
    id: string
    name: string
  }>
  students: Array<{
    id: string
    username: string
    subgroupId: string | null
  }>
}

export type {
  CreateGroupRequest,
  GroupResponse,
  StudentGroupFilterRequest,
  StudentGroupListDto,
}
