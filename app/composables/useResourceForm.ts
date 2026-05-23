import type { Form } from '#ui/types'
import type { GenericSchema } from 'valibot'

interface ResourceFormOptions<TState extends Record<string, unknown>> {
  initialState: () => TState
  successMessage?: string
  onSuccess?: () => void | Promise<void>
}

export function useResourceForm<
  TSchema extends GenericSchema,
  TState extends Record<string, unknown>,
>(options: ResourceFormOptions<TState>) {
  const state = reactive(options.initialState()) as TState
  const formRef = useTemplateRef<Form<TSchema>>('form')
  const { loading, submit } = useFormSubmit()

  async function validate(): Promise<TState | undefined> {
    const data = await formRef.value?.validate({ transform: true })
    return data as TState | undefined
  }

  async function handleSubmit<T>(
    request: (validated: TState) => Promise<T>,
  ): Promise<T | undefined> {
    const data = await validate()
    if (!data)
      return undefined

    return submit(() => request(data), {
      successMessage: options.successMessage,
      onSuccess: options.onSuccess,
    })
  }

  return { state, formRef, loading, submit, validate, handleSubmit }
}
