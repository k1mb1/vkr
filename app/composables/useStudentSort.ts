export type StudentSortKey = 'name' | 'rating'

/**
 * Общий выбор сортировки студентов в таблицах: по алфавиту или по рейтингу
 * (сумме баллов / посещаемости — каждая таблица считает рейтинг по-своему).
 */
export function useStudentSort(initial: StudentSortKey = 'name') {
  const sortBy = ref<StudentSortKey>(initial)

  const sortItems = [
    { label: 'По алфавиту', value: 'name' as const, icon: 'i-lucide-arrow-down-a-z' },
    { label: 'По рейтингу', value: 'rating' as const, icon: 'i-lucide-trophy' },
  ]

  return { sortBy, sortItems }
}
