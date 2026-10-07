// Пример код-плагина. Модуль экспортирует setup(sdk): Vue, компоненты
// @nuxt/ui и регистрация компонентов приходят из SDK хоста, поэтому плагину
// не нужна своя сборка — это обычный ES-модуль.

const BANDS = [
  { label: 'A', min: 90, color: 'bg-success' },
  { label: 'B', min: 82, color: 'bg-success' },
  { label: 'C', min: 75, color: 'bg-primary' },
  { label: 'D', min: 68, color: 'bg-primary' },
  { label: 'E', min: 61, color: 'bg-warning' },
  { label: 'FX', min: 41, color: 'bg-error' },
  { label: 'F', min: -Infinity, color: 'bg-error' },
]

function median(values) {
  if (!values.length)
    return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const avg = values => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)
const fmt = n => `${Math.round(n)}%`

function summarize(label, rows) {
  const percents = rows.map(r => r.percent)
  const bands = BANDS.map(b => ({ ...b, count: 0 }))
  for (const p of percents)
    bands.find(b => p >= b.min).count++
  return {
    label,
    count: rows.length,
    avg: avg(percents),
    median: median(percents),
    attendance: avg(rows.map(r => r.attendancePercent)),
    debtors: rows.filter(r => r.requiredTotal > r.requiredClosed).length,
    bands,
  }
}

export default function setup(sdk) {
  const { h, computed, defineComponent } = sdk.vue
  const { UCard, UBadge, UProgress } = sdk.ui

  function stat(label, value, hint) {
    return h('div', { class: 'flex flex-col gap-0.5 min-w-0' }, [
      h('span', { class: 'text-xs text-muted uppercase tracking-wide' }, label),
      h('span', { class: 'text-xl font-semibold tabular-nums text-highlighted' }, value),
      hint ? h('span', { class: 'text-xs text-dimmed' }, hint) : null,
    ])
  }

  function distribution(bands, total) {
    return h('div', { class: 'flex flex-col gap-1.5' }, bands.map(b =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'w-6 text-xs font-medium text-muted tabular-nums' }, b.label),
        h('div', { class: 'flex-1 h-2 rounded-full bg-muted overflow-hidden' }, [
          h('div', { class: `h-full rounded-full ${b.color}`, style: { width: `${total ? (b.count / total) * 100 : 0}%` } }),
        ]),
        h('span', { class: 'w-6 text-xs tabular-nums text-default' }, String(b.count)),
      ]),
    ))
  }

  function card(s) {
    return h(UCard, null, {
      header: () => h('div', { class: 'flex items-center justify-between gap-2' }, [
        h('span', { class: 'font-semibold text-highlighted truncate' }, s.label),
        h(UBadge, { color: 'neutral', variant: 'subtle' }, () => `${s.count} студ.`),
      ]),
      default: () => h('div', { class: 'flex flex-col gap-4' }, [
        h('div', { class: 'grid grid-cols-2 gap-3' }, [
          stat('Средний балл', fmt(s.avg)),
          stat('Медиана', fmt(s.median)),
          stat('Посещаемость', fmt(s.attendance)),
          stat('Должники', String(s.debtors), 'не закрыты обязательные'),
        ]),
        h('div', { class: 'flex flex-col gap-1' }, [
          h('span', { class: 'text-xs text-muted' }, 'Средняя посещаемость'),
          h(UProgress, { modelValue: Math.round(s.attendance), color: s.attendance < 70 ? 'warning' : 'success' }),
        ]),
        h('div', { class: 'flex flex-col gap-2' }, [
          h('span', { class: 'text-xs text-muted' }, 'Распределение по ECTS'),
          distribution(s.bands, s.count),
        ]),
      ]),
    })
  }

  sdk.registerComponent('GroupAnalytics', defineComponent({
    name: 'GroupAnalytics',
    props: {
      rows: { type: Array, required: true },
    },
    setup(props) {
      const summaries = computed(() => {
        const byGroup = new Map()
        for (const r of props.rows) {
          if (!byGroup.has(r.group))
            byGroup.set(r.group, [])
          byGroup.get(r.group).push(r)
        }
        const list = [...byGroup].map(([g, rows]) => summarize(g, rows))
        if (list.length > 1)
          list.unshift(summarize('Все группы', props.rows))
        return list
      })
      return () => h('div', { class: 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' }, summaries.value.map(card))
    },
  }))
}
