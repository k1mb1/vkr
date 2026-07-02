import type { FormError } from '@nuxt/ui'

export interface SubmitOptions<T> {
  successMessage?: string | ((result: T) => string)
  onSuccess?: (result: T) => unknown
  /** Форма для раскладки fieldErrors под поля; если задана и ошибки по полям — тост не показываем. */
  form?: { setErrors: (errors: FormError[]) => void } | null
}

export function useFormSubmit() {
  const loading = ref(false)
  const { toastError, toast } = useApiError()

  async function submit<T>(
    fn: () => Promise<{ data?: T, error?: unknown }>,
    options: SubmitOptions<T> = {},
  ): Promise<T | undefined> {
    loading.value = true
    const { data, error } = await $api(fn)
    loading.value = false

    if (error) {
      if (!applyFieldErrors(options.form, error))
        toastError(error)
      return undefined
    }

    const result = data as T
    const title = typeof options.successMessage === 'function'
      ? options.successMessage(result)
      : options.successMessage
    if (title)
      toast.add({ title, color: 'success', icon: 'i-lucide-check' })
    await options.onSuccess?.(result)
    return result
  }

  return { loading, submit }
}
