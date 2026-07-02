import type { Form, FormSubmitEvent } from '@nuxt/ui'
import type { GenericSchema, InferOutput } from 'valibot'
import type { SubmitOptions } from './useFormSubmit'

interface ResourceFormOptions<TState> {
  initialState: () => TState
  successMessage?: string | ((result: TState) => string)
}

export function useResourceForm<TSchema extends GenericSchema<unknown, object>>(
  options: ResourceFormOptions<InferOutput<TSchema>>,
) {
  type TState = InferOutput<TSchema>

  const formRef = ref<Form<TSchema> | null>(null)
  const state = reactive(options.initialState()) as TState
  const { loading, submit } = useFormSubmit()

  const dirtyFields = computed<ReadonlySet<keyof TState>>(
    () => (formRef.value?.dirtyFields ?? new Set()) as ReadonlySet<keyof TState>,
  )

  async function validate(): Promise<TState | undefined> {
    const result = await formRef.value?.validate({ transform: true })
    if (result === false || result == null)
      return undefined
    return result as TState
  }

  async function handleSubmit<T>(
    request: (validated: TState) => Promise<{ data?: T, error?: unknown }>,
    callbacks: SubmitOptions<T> = {},
  ): Promise<T | undefined> {
    const data = await validate()
    if (!data)
      return undefined

    return submit(() => request(data), {
      form: formRef.value,
      successMessage: callbacks.successMessage ?? (
        typeof options.successMessage === 'function'
          ? options.successMessage(data)
          : options.successMessage
      ),
      onSuccess: callbacks.onSuccess,
    })
  }

  // Native UForm @submit handler factory: UForm already validated when this
  // fires, so we just forward `event.data` through useFormSubmit. The handler
  // resolves to `void` so UForm's typing accepts it; the API result is
  // delivered to `callbacks.onSuccess`.
  function onSubmit<T>(
    request: (validated: TState) => Promise<{ data?: T, error?: unknown }>,
    callbacks: SubmitOptions<T> = {},
  ) {
    return async (event: FormSubmitEvent<TState>): Promise<void> => {
      const data = event.data
      await submit(() => request(data), {
        form: formRef.value,
        successMessage: callbacks.successMessage ?? (
          typeof options.successMessage === 'function'
            ? options.successMessage(data)
            : options.successMessage
        ),
        onSuccess: callbacks.onSuccess,
      })
    }
  }

  return {
    state,
    formRef,
    loading,
    dirtyFields,
    validate,
    submit,
    handleSubmit,
    onSubmit,
    // @error: фокус + скролл к первому невалидному полю.
    onError: focusFirstError,
  }
}
