import type { components } from '#open-fetch-schemas/backend'
import type { FetchError } from 'ofetch'

type BackendErrorResponse = components['schemas']['Error']

function extractMessage(error: FetchError): string {
  const data = error.data as BackendErrorResponse | undefined
  return data?.message || data?.details || error.message || 'Что-то пошло не так'
}

export function useApiError() {
  const toast = useToast()

  function toastError(error: FetchError, title = 'Ошибка') {
    toast.add({
      title,
      description: extractMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }

  function alertProps(error: FetchError, title = 'Ошибка') {
    return {
      color: 'error' as const,
      variant: 'soft' as const,
      icon: 'i-lucide-circle-alert',
      title,
      description: extractMessage(error),
    }
  }

  return { toastError, alertProps, toast }
}
