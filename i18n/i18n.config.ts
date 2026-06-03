import type { DateTimeFormat } from '@intlify/core-base'

// Единые форматы дат для всего приложения. Используются через `d(date, '<key>')`
// из vue-i18n и следуют активной локали (см. AppLocaleSelect).
const datetimeFormat: DateTimeFormat = {
  // 2 февр. 2026 г. / Feb 2, 2026
  short: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
  // 2 февраля 2026 г. / February 2, 2026
  long: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  // понедельник, 2 февраля 2026 г. / Monday, February 2, 2026
  full: {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  // 2 февр. / Feb 2 — компактный вариант для узких заголовков столбцов
  dayMonth: {
    month: 'short',
    day: 'numeric',
  },
  // 02.02.2026 / 02/02/2026 — числовой, для экспорта
  numeric: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  },
  // 02.02.2026, 14:30 — дата и время
  datetime: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  },
  // 02.02.2026, 14:30:45 — дата и время с секундами
  datetimeSeconds: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  },
  // 14:30:45 — только время
  time: {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  },
}

export default defineI18nConfig(() => ({
  legacy: false,
  datetimeFormats: {
    ru: datetimeFormat,
    en: datetimeFormat,
  },
}))
