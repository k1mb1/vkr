import type { ButtonProps } from '@nuxt/ui'

/**
 * Дизайн-токены для типовых действий в тулбарах (A4 из ui-ux-redesign-planning).
 * Раньше «Обновить»/«Экспорт»/«Сохранить» оформлялись по-разному от страницы к
 * странице (то ghost, то outline, то с лейблом, то без). Здесь — единый набор
 * пропсов на роль действия; страница добавляет только `label`, `loading`,
 * `disabled` и обработчик. Порядок в тулбаре: слева контекст, справа действия;
 * деструктивные — отдельно.
 */
export const toolbarButton = {
  /** Основное действие экрана (создать, сохранить, подтвердить). */
  primary: { color: 'primary', variant: 'solid' },
  /** Второстепенное действие. */
  secondary: { color: 'neutral', variant: 'outline' },
  /** Обновить данные вручную. */
  refresh: { icon: 'i-lucide-refresh-cw', color: 'neutral', variant: 'ghost' },
  /** Экспорт в Excel (обычно триггер выпадающего меню). */
  export: { icon: 'i-lucide-file-spreadsheet', trailingIcon: 'i-lucide-chevron-down', color: 'neutral', variant: 'ghost' },
  /** Создать сущность. */
  create: { icon: 'i-lucide-plus', color: 'primary', variant: 'solid' },
  /** Сохранить изменения. */
  save: { icon: 'i-lucide-save', color: 'primary', variant: 'solid' },
  /** Сбросить/отменить несохранённые изменения. */
  reset: { icon: 'i-lucide-undo-2', color: 'neutral', variant: 'ghost' },
  /** Деструктивное действие (удалить, отменить сессию). */
  destructive: { icon: 'i-lucide-trash-2', color: 'error', variant: 'soft' },
} as const satisfies Record<string, Partial<ButtonProps>>
