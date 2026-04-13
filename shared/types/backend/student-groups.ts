export interface CreateGroupRequest {
	groupName: string
	studentNames: string[][]
}

export interface StudentGroupPageResponse {
	id: string
	name: string
	subgroupCount: number
}

export interface StudentEntryResponse {
	id: string
	name: string
}

export interface StudentGroupResponse {
	id: string
	name: string
	students: StudentEntryResponse[]
	subgroups: SubgroupResponse[]
}

export interface SubgroupResponse {
	id: string
	name: string
	students: StudentEntryResponse[]
}
