import type {
  PageQuery,
  PageRequest,
  PageResponse,
  StudentGroupFilterRequest,
  StudentGroupListDto,
} from '#shared/types/backend'
import type { MaybeRefOrGetter } from 'vue'
import type { BackendFetchResult } from '~/composables/useBackendFetch'
import { toPageQuery } from '#shared/types/backend'
import { toValue } from 'vue'
import { $backendFetch, useBackendFetch } from '~/composables/useBackendFetch'

export function useStudentGroups(
  request?: MaybeRefOrGetter<PageRequest<StudentGroupFilterRequest>>,
): BackendFetchResult<PageResponse<StudentGroupListDto>> {
  return useBackendFetch<PageResponse<StudentGroupListDto>>(`/student-groups`, {
    method: 'GET',
    query: () => toPageQuery(request ? toValue(request) : undefined) as PageQuery,
  })
}