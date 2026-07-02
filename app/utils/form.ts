import type { FormError, FormErrorEvent } from '@nuxt/ui'

interface FieldErrorsTarget {
  setErrors: (errors: FormError[]) => void
}

/**
 * Раскладывает `fieldErrors` из {@link ApiError} под поля формы.
 * Возвращает `true`, если ошибки были по полям (тогда общий тост не нужен).
 */
export function applyFieldErrors(
  form: FieldErrorsTarget | null | undefined,
  error: { fieldErrors?: { field?: string, message?: string }[] } | null | undefined,
): boolean {
  const mapped: FormError[] = (error?.fieldErrors ?? [])
    .filter((fe): fe is { field: string, message?: string } => !!fe.field)
    .map(fe => ({ name: fe.field, message: fe.message ?? '' }))
  if (!form || !mapped.length)
    return false
  form.setErrors(mapped)
  return true
}

/**
 * Ставит фокус на первое невалидное поле формы и плавно прокручивает к нему.
 *
 * Используется как обработчик `@error` компонента `UForm` — событие эмитится,
 * когда схема-валидация провалена (вместо `@submit`). UForm уже проставляет
 * `id` каждому инпуту, связывая его с `UFormField name`.
 *
 * @example
 *   <UForm :state="state" :schema="schema" @submit="onSubmit" @error="focusFirstError">
 *
 * Автоимпортируется Nuxt из `app/utils` — в любой форме пишешь просто `focusFirstError`.
 */
export function focusFirstError(event: FormErrorEvent): void {
  const id = event?.errors?.[0]?.id
  if (!id)
    return

  const element = document.getElementById(id)
  if (!element)
    return

  element.focus()
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
