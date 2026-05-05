interface StudentGroupListDto {
  id: string
  name: string
  subgroupCount: number
  totalStudentCount: number
}

interface StudentGroupFilterRequest {
  name?: string
}

export type {
  StudentGroupFilterRequest,
  StudentGroupListDto,
}
