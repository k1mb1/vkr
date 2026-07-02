export function useApiError() {
  const toast = useToast()

  function messageOf(error: unknown): string {
    return toApiError(error).message
  }

  function toastError(error: unknown, title = 'Ошибка') {
    toast.add({
      title,
      description: messageOf(error),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }

  function alertProps(error: unknown, title = 'Ошибка') {
    return {
      color: 'error' as const,
      variant: 'soft' as const,
      icon: 'i-lucide-circle-alert',
      title,
      description: messageOf(error),
    }
  }

  return { toastError, alertProps, toast }
}
