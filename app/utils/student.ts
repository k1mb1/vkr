/**
 * Приводит ФИО студента к аккуратному виду: схлопывает лишние пробелы и делает
 * каждое слово с заглавной буквы, остальные — строчными. Учитывает части через
 * дефис (например, «петрова-водкина» → «Петрова-Водкина»).
 */
export function formatStudentName(raw: string): string {
  const capitalizeWord = (word: string): string =>
    word
      .split('-')
      .map(part =>
        part
          ? part.charAt(0).toLocaleUpperCase('ru-RU') + part.slice(1).toLocaleLowerCase('ru-RU')
          : part,
      )
      .join('-')

  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizeWord)
    .join(' ')
}
