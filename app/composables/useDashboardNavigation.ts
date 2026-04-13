import type { NavigationMenuItem } from '@nuxt/ui'

function createSection(
  items: NavigationMenuItem[],
  condition = true
): NavigationMenuItem[][] {
  return condition ? [items] : []
}

export function useDashboardNavigation() {
  const mainLinks: NavigationMenuItem[] = [
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
    }, {
      label: 'Groups',
      icon: 'i-lucide-users',
      to: '/dashboard/groups'
    }
  ]

  const debugLinks: NavigationMenuItem[] = [
    {
      label: 'Debug',
      icon: 'i-lucide-flask-conical',
      to: '/dashboard/debug'
    }
  ]

  const externalLinks: NavigationMenuItem[] = [
    {
      label: 'Feedback',
      icon: 'i-lucide-message-circle',
      to: 'https://k1mbb.t.me',
      target: '_blank'
    }
  ]

  const sections: NavigationMenuItem[][] = [
    ...createSection(mainLinks),
    ...createSection(debugLinks, import.meta.dev),
    ...createSection(externalLinks)
  ]

  return { links: sections }
}
