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
    button: {
      defaultVariants: {
        variant: 'outline',
      },
    },
    badge: {
      defaultVariants: {
        variant: 'subtle',
      },
    },
    table: {
      slots: {
        root: 'relative overflow-auto rounded-lg border border-default',
        td: 'p-4 text-sm text-muted whitespace-nowrap border border-default [&:has([role=checkbox])]:pe-0',
        th: 'px-4 py-3.5 text-sm text-highlighted text-left rtl:text-right font-semibold border border-default bg-elevated [&:has([role=checkbox])]:pe-0',
        thead: 'relative bg-elevated border-b-2 border-accented',
        tbody: 'isolate [&>tr]:data-[selectable=true]:hover:bg-elevated/50 [&>tr]:data-[selectable=true]:focus-visible:outline-primary',
      },
    },
  },
})
