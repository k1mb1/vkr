import { FetchError } from 'ofetch'

export interface SubmitOptions<T> {
  successMessage?: string | ((result: T) => string)
  onSuccess?: (result: T) => unknown
}

export function useFormSubmit() {
  const loading = ref(false)
  const { toastError, toast } = useApiError()

  async function submit<T>(
    fn: () => Promise<T>,
    options: SubmitOptions<T> = {},
  ): Promise<T | undefined> {
    loading.value = true
    try {
      const result = await fn()
      const title = typeof options.successMessage === 'function'
        ? options.successMessage(result)
        : options.successMessage
      if (title) {
        toast.add({
          title,
          color: 'success',
          icon: 'i-lucide-check',
        })
      }
      await options.onSuccess?.(result)
      return result
    }
    catch (e) {
      if (e instanceof FetchError) {
        toastError(e)
        return undefined
      }
      throw e
    }
    finally {
      loading.value = false
    }
  }

  return { loading, submit }
}
