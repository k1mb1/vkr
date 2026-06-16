export interface StudentInputOptions {
  /** Разделитель для парсинга (по умолчанию `/\\s+/`) */
  separator?: RegExp
  /**
   * Нормализация каждого имени при добавлении (по умолчанию — `formatStudentName`:
   * каждое слово с заглавной буквы, остальные строчные, через один пробел).
   */
  normalize?: (username: string) => string
}

export interface UseStudentInputReturn<T extends { username: string }> {
  parseUsernames: (raw: string) => string[]
  addStudents: (
    raw: string,
    subgroupId: unknown,
    students: T[],
    factory: (username: string, subgroupId: unknown) => T,
  ) => void
  handlePaste: (
    e: ClipboardEvent,
    subgroupId: unknown,
    students: T[],
    factory: (username: string, subgroupId: unknown) => T,
  ) => boolean
}

export function useStudentInput<T extends { username: string }>(
  options: StudentInputOptions = {},
): UseStudentInputReturn<T> {
  const separator = options.separator ?? /\s+/
  const normalize = options.normalize ?? formatStudentName

  function parseUsernames(raw: string): string[] {
    return raw
      .split(separator)
      .map(s => normalize(s.trim()))
      .filter(Boolean)
  }

  function addStudents(
    raw: string,
    subgroupId: unknown,
    students: T[],
    factory: (username: string, subgroupId: unknown) => T,
  ): void {
    const usernames = parseUsernames(raw)
    const existing = new Set(students.map(s => s.username))

    for (const username of usernames) {
      if (!existing.has(username)) {
        students.push(factory(username, subgroupId))
        existing.add(username)
      }
    }
  }

  function handlePaste(
    e: ClipboardEvent,
    subgroupId: unknown,
    students: T[],
    factory: (username: string, subgroupId: unknown) => T,
  ): boolean {
    const text = e.clipboardData?.getData('text') ?? ''
    if (!text.includes('\n')) {
      return false
    }

    e.preventDefault()
    addStudents(text, subgroupId, students, factory)
    return true
  }

  return {
    parseUsernames,
    addStudents,
    handlePaste,
  }
}
