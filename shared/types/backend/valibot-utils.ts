import type { BaseIssue, BaseSchema } from 'valibot'
import * as v from 'valibot'

export type SchemaFor<T> = BaseSchema<unknown, T, BaseIssue<unknown>>

export function requiredTrimmedStringSchema(requiredMessage: string) {
  return v.pipe(v.string(), v.trim(), v.minLength(1, requiredMessage))
}

export function requiredTrimmedStringWithMaxSchema(requiredMessage: string, maxLength: number, maxMessage: string) {
  return v.pipe(v.string(), v.trim(), v.minLength(1, requiredMessage), v.maxLength(maxLength, maxMessage))
}

export function optionalTrimmedStringWithMaxSchema(maxLength: number, maxMessage?: string) {
  return v.optional(v.pipe(v.string(), v.trim(), v.maxLength(maxLength, maxMessage)))
}

export function uuidV4Schema(message: string) {
  return v.pipe(v.string(), v.uuid(message))
}

export function isoDateTimeSchema(message: string) {
  return v.pipe(v.string(), v.isoDateTime(message))
}

export function nonNegativeIntegerSchema(integerMessage: string, nonNegativeMessage: string) {
  return v.pipe(v.number(), v.integer(integerMessage), v.minValue(0, nonNegativeMessage))
}

export function emailSchema(message: string) {
  return v.pipe(v.string(), v.trim(), v.email(message))
}
