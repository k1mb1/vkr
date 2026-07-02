<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Аффорданс горизонтальной прокрутки для широких матриц (E1).
 *
 * Оборачивает прокручиваемый контент и показывает справа мягкую тень + стрелку,
 * пока есть скрытые справа колонки. На мобильных/планшетах матрицы студенты ×
 * занятия шире экрана — без подсказки неочевидно, что таблицу можно листать.
 *
 * Скролл-контейнер ищем внутри слота (UTable рендерит свой overflow-контейнер),
 * поэтому компонент не завязан на конкретную вёрстку таблицы.
 */
const root = ref<HTMLElement | null>(null)
const showRight = ref(false)

let scroller: HTMLElement | null = null
let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null

function findScroller(el: HTMLElement): HTMLElement | null {
  if (scroller && el.contains(scroller) && scroller.isConnected)
    return scroller
  if (el.scrollWidth > el.clientWidth + 1)
    return el
  for (const child of el.querySelectorAll<HTMLElement>('*')) {
    const ox = getComputedStyle(child).overflowX
    if ((ox === 'auto' || ox === 'scroll') && child.scrollWidth > child.clientWidth + 1)
      return child
  }
  return null
}

function update() {
  const el = root.value
  if (!el)
    return
  scroller = findScroller(el)
  if (!scroller) {
    showRight.value = false
    return
  }
  const { scrollLeft, scrollWidth, clientWidth } = scroller
  showRight.value = scrollLeft + clientWidth < scrollWidth - 2
}

onMounted(() => {
  const el = root.value
  if (!el)
    return
  // scroll не всплывает — слушаем в фазе перехвата, чтобы поймать прокрутку вложенного контейнера.
  el.addEventListener('scroll', update, { capture: true, passive: true })
  ro = new ResizeObserver(update)
  ro.observe(el)
  // Данные таблицы приезжают асинхронно — реагируем на изменения поддерева.
  mo = new MutationObserver(update)
  mo.observe(el, { childList: true, subtree: true })
  update()
})

onBeforeUnmount(() => {
  root.value?.removeEventListener('scroll', update, { capture: true } as EventListenerOptions)
  ro?.disconnect()
  mo?.disconnect()
})
</script>

<template>
  <div ref="root" class="relative">
    <slot />

    <!-- Правый градиент + стрелка: есть ещё колонки справа. -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showRight"
        class="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-gradient-to-l from-default to-transparent"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-chevron-right" class="size-5 text-muted animate-pulse" />
      </div>
    </Transition>
  </div>
</template>
