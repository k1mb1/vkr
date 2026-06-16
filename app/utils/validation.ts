import type { BaseIssue, BaseSchema } from 'valibot'
import { CalendarDate, CalendarDateTime, getLocalTimeZone, ZonedDateTime } from '@internationalized/date'
import * as v from 'valibot'

type SchemaFor<T> = BaseSchema<unknown, T, BaseIssue<unknown>>
type CalendarValue = CalendarDate | CalendarDateTime | ZonedDateTime

function calendarValue(message: string) {
  return v.union([v.instance(CalendarDate), v.instance(CalendarDateTime), v.instance(ZonedDateTime)], message)
}

function string(message = 'Field is required') {
  return v.pipe(v.string(), v.trim(), v.minLength(1, message))
}

function stringMax(maxLength: number, requiredMessage = 'Field is required', maxMessage = `Must be at most ${maxLength} characters`) {
  return v.pipe(string(requiredMessage), v.maxLength(maxLength, maxMessage))
}

function uuidV4(message = 'Must be a valid UUID v4') {
  return v.pipe(v.string(), v.uuid(message))
}

function isoDateTime(message = 'Must be a valid ISO datetime') {
  return v.pipe(v.string(), v.isoDateTime(message))
}

function hexColor(message = 'Формат HEX: #RRGGBB') {
  return v.pipe(v.string('Введите цвет'), v.regex(/^#[0-9A-F]{6}$/i, message))
}

function nonNegativeInteger(integerMessage = 'Must be an integer', nonNegativeMessage = 'Must be non-negative') {
  return v.pipe(v.number(), v.integer(integerMessage), v.minValue(0, nonNegativeMessage))
}

function email(message = 'Must be a valid email address') {
  return v.pipe(v.string(), v.trim(), v.email(message))
}

function calendarDateToIso(message = 'Must be a valid calendar date') {
  return v.pipe(
    calendarValue(message),
    v.transform((value: CalendarValue): string => value.toString()),
  )
}

function calendarDateTimeToIso(message = 'Must be a valid calendar datetime') {
  return v.pipe(
    calendarValue(message),
    v.transform((value: CalendarValue): string => value.toDate(getLocalTimeZone()).toISOString()),
  )
}

export type {
  SchemaFor,
}

function arrayMinLength<T extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
  schema: T,
  minLength: number,
  message = `Must contain at least ${minLength} items`,
) {
  return v.pipe(v.array(schema), v.minLength(minLength, message))
}

export {
  arrayMinLength,
  calendarDateTimeToIso,
  calendarDateToIso,
  email,
  hexColor,
  isoDateTime,
  nonNegativeInteger,
  string,
  stringMax,
  uuidV4,
}
