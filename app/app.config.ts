export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'slate',
      neutral: 'zinc',
      success: 'teal',
      info: 'sky',
      warning: 'amber',
      error: 'red',
    },
    table: {
      slots: {
        root: 'relative overflow-auto border border-default rounded-(--ui-radius)',
        base: 'min-w-full overflow-clip',
        thead: 'relative border-b border-default',
        tbody: 'isolate [&>tr]:data-[selectable=true]:hover:bg-elevated/50 [&>tr]:data-[selectable=true]:focus-visible:outline-primary divide-y divide-default',
        tr: 'data-[selected=true]:bg-elevated/50',
        th: 'px-4 py-3 text-xs text-muted text-left rtl:text-right font-medium uppercase tracking-wider border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
        td: 'px-4 py-3 text-sm text-default whitespace-nowrap border-r border-default last:border-r-0 [&:has([role=checkbox])]:pe-0',
        empty: 'py-6 text-center text-sm text-muted',
        loading: 'py-6 text-center',
      },
    },
  },
})
