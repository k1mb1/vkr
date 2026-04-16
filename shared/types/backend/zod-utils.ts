import { z } from 'zod'

function requiredTrimmedStringSchema(requiredMessage: string) {
  return z.string()
    .trim()
    .min(1, { message: requiredMessage })
}

function requiredTrimmedStringWithMaxSchema(requiredMessage: string, maxLength: number, maxMessage: string) {
  return requiredTrimmedStringSchema(requiredMessage)
    .max(maxLength, { message: maxMessage })
}

function optionalTrimmedStringWithMaxSchema(maxLength: number, maxMessage?: string) {
  if (maxMessage) {
    return z.string().trim().max(maxLength, { message: maxMessage }).optional()
  }

  return z.string().trim().max(maxLength).optional()
}

function uuidV4Schema(message: string) {
  return z.uuid({ version: 'v4', message })
}

function isoDateTimeSchema(message: string) {
  return z.iso.datetime({ message })
}

function nonNegativeIntegerSchema(integerMessage: string, nonNegativeMessage: string) {
  return z.number()
    .int({ message: integerMessage })
    .min(0, { message: nonNegativeMessage })
}

function emailSchema(message: string) {
  return z.string()
    .trim()
    .pipe(z.email({ message }))
}

export {
  emailSchema,
  isoDateTimeSchema,
  nonNegativeIntegerSchema,
  optionalTrimmedStringWithMaxSchema,
  requiredTrimmedStringSchema,
  requiredTrimmedStringWithMaxSchema,
  uuidV4Schema,
}
