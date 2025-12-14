import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface Card {
  id: string
  giftName: string
  isOpened: boolean
}

export const useCardStore = defineStore('card', () => {
  // 卡片列表（暫時設定 5 張，後續可調整）
  const cards = ref<Card[]>([
    { id: '1', giftName: '禮物 1', isOpened: false },
    { id: '2', giftName: '禮物 2', isOpened: false },
    { id: '3', giftName: '禮物 3', isOpened: false },
    { id: '4', giftName: '禮物 4', isOpened: false },
    { id: '5', giftName: '禮物 5', isOpened: false },
  ])

  // 計算是否所有卡片都已開啟
  const allCardsOpened = computed(() => {
    return cards.value.every((card) => card.isOpened)
  })

  // 開啟卡片
  function openCard(cardId: string) {
    const card = cards.value.find((c) => c.id === cardId)
    if (card) {
      card.isOpened = true
    }
  }

  // 重置所有卡片
  function resetCards() {
    cards.value.forEach((card) => {
      card.isOpened = false
    })
  }

  return {
    cards,
    allCardsOpened,
    openCard,
    resetCards,
  }
})

