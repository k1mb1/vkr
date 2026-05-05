type StudentGroupListDto = {
  id: string;
  name: string;
  subgroupCount: number;
  totalStudentCount: number;
};

interface StudentGroupFilterRequest {
  name?: string;
}

export type {
  StudentGroupListDto,
  StudentGroupFilterRequest,
}
