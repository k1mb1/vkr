export type SubgroupId = number | undefined

export interface SubgroupCard {
  id: number
  subgroupIndex: SubgroupId
  input: string
}

export interface UseSubgroupCardsReturn {
  subgroups: Ref<SubgroupId[]>
  cards: ComputedRef<SubgroupCard[]>
  hasSubgroups: ComputedRef<boolean>
  cardLabel: (subgroupIndex: SubgroupId) => string
  addCard: () => void
  removeCard: (subgroupIndex: SubgroupId) => void
  resetCards: () => void
}

export function useSubgroupCards(): UseSubgroupCardsReturn {
  const subgroups = ref<SubgroupId[]>([undefined])

  let nextCardId = 1
  const cardInputs = reactive(new Map<number, string>())

  const cards = computed<SubgroupCard[]>(() =>
    subgroups.value.map((id) => {
      const cardId = nextCardId++
      if (!cardInputs.has(cardId)) {
        cardInputs.set(cardId, '')
      }
      return {
        id: cardId,
        subgroupIndex: id,
        get input() {
          return cardInputs.get(cardId) ?? ''
        },
        set input(value: string) {
          cardInputs.set(cardId, value)
        },
      }
    }),
  )

  const hasSubgroups = computed(() =>
    subgroups.value.some(id => id !== undefined),
  )

  function cardLabel(subgroupIndex: SubgroupId): string {
    if (!hasSubgroups.value)
      return 'Без подгруппы'

    const pos = (subgroupIndex ?? 0) + 1
    return `Подгруппа ${pos}`
  }

  function addCard(): void {
    const hasUndefined = subgroups.value.includes(undefined)

    if (hasUndefined) {
      subgroups.value = subgroups.value.map(id => id ?? 0)
    }

    const nextIndex = Math.max(0, ...subgroups.value.filter((v): v is number => v !== undefined)) + 1
    subgroups.value.push(nextIndex)
  }

  function removeCard(subgroupIndex: SubgroupId): void {
    if (subgroupIndex == null)
      return

    subgroups.value = subgroups.value.filter(id => id !== subgroupIndex)

    if (subgroups.value.length === 1) {
      subgroups.value = [undefined]
    }
  }

  function resetCards(): void {
    subgroups.value = [undefined]
    cardInputs.clear()
    nextCardId = 1
  }

  return {
    subgroups,
    cards,
    hasSubgroups,
    cardLabel,
    addCard,
    removeCard,
    resetCards,
  }
}
