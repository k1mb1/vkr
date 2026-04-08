import type { NavigationMenuItem } from '@nuxt/ui'

export function useDashboardNavigation() {
  const links: NavigationMenuItem[][] = [
    [
      {
        label: 'Главная',
        icon: 'i-lucide-house',
        to: '/dashboard',
        exact: true
      },
      {
        label: 'Subjects',
        icon: 'i-lucide-book-open',
        to: '/dashboard/subjects'
      },
      {
        label: 'Lessons',
        icon: 'i-lucide-calendar-days',
        to: '/dashboard/lessons'
      },
      {
        label: 'Groups',
        icon: 'i-lucide-users',
        to: '/dashboard/groups'
      }
    ],
    [
      {
        label: 'Feedback',
        icon: 'i-lucide-message-circle',
        to: 'https://k1mbb.t.me',
        target: '_blank'
      }
    ]
  ]

  return { links }
}
