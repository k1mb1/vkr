import type { InstalledPlugin, InstalledPluginsResponse, SubjectPageContribution } from '#shared/plugins/manifest'

export interface SubjectPluginPage extends SubjectPageContribution {
  pluginId: string
  pluginName: string
}

/**
 * Установленные плагины маркетплейса и то, что они добавляют в приложение.
 * Состояние общее (один ключ useFetch) — меню, обзор предмета и страница
 * плагина видят один и тот же список.
 */
export function usePlugins() {
  const { data, pending, error, refresh } = useFetch<InstalledPluginsResponse>('/api/plugins', {
    key: 'plugins:installed',
    default: () => ({ plugins: [], canManage: false }),
    server: false,
  })

  const plugins = computed<InstalledPlugin[]>(() => data.value?.plugins ?? [])
  const enabledPlugins = computed(() => plugins.value.filter(p => p.enabled))
  const canManage = computed(() => data.value?.canManage ?? false)

  const subjectPages = computed<SubjectPluginPage[]>(() =>
    enabledPlugins.value.flatMap(p =>
      (p.manifest.contributes?.subjectPages ?? []).map(page => ({
        ...page,
        pluginId: p.id,
        pluginName: p.manifest.name,
      })),
    ),
  )

  function subjectPagePath(subjectId: string, page: Pick<SubjectPluginPage, 'pluginId' | 'id'>): string {
    return `/dashboard/subjects/${subjectId}/ext/${page.pluginId}/${page.id}`
  }

  return { plugins, enabledPlugins, canManage, subjectPages, subjectPagePath, pending, error, refresh }
}
