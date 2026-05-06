export interface StudentGroupListDto {
  id: string
  name: string
  subgroupCount: number
  totalStudentCount: number
}

export interface StudentGroupFilterRequest {
  name?: string
}

export interface CreateGroupRequest {
  groupName: string
  students: Array<{
    username: string
    subgroupIndex: number | null
  }>
}

export interface GroupResponse {
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

export interface UpdateGroupRequest {
  groupName: string
  students: Array<{
    id: string | null
    username: string
    subgroupId: string | null
  }>
}
