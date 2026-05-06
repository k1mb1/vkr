import type { InferOutput } from 'valibot'
import type { SchemaFor } from '../valibot-utils'
import type { CreateGroupRequest, UpdateGroupRequest } from './types'
import * as v from 'valibot'

export const CreateGroupRequestSchema: SchemaFor<CreateGroupRequest> = v.object({
  groupName: v.pipe(v.string(), v.minLength(1, 'Введите название группы')),
  students: v.pipe(
    v.array(
      v.object({
        username: v.string(),
        subgroupIndex: v.union([v.null(), v.number()]),
      }),
    ),
    v.minLength(1, 'Добавьте хотя бы одного студента'),
  ),
})

export type CreateGroupRequestPayload = InferOutput<typeof CreateGroupRequestSchema>

export const UpdateGroupRequestSchema: SchemaFor<UpdateGroupRequest> = v.object({
  groupName: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  students: v.pipe(
    v.array(
      v.object({
        id: v.nullable(v.pipe(v.string(), v.uuid())),
        username: v.pipe(v.string(), v.trim(), v.nonEmpty()),
        subgroupId: v.nullable(v.pipe(v.string(), v.uuid())),
      }),
    ),
    v.nonEmpty(),
  ),
})

export type UpdateGroupRequestPayload = InferOutput<typeof UpdateGroupRequestSchema>
