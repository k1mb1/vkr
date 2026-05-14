export interface TeachingCreateState {
  offeringId?: string
  groupId?: string
  existingTeacherIds: string[]
}

export function useTeachingCreateState() {
  return useState<TeachingCreateState | undefined>('teaching-create', () => undefined)
}
