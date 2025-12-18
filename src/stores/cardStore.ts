import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import giftDog from '@/assets/gift_dog.jpg'
import giftDogChristmas from '@/assets/gift_dog_christmas.jpg'
import giftChiikawa from '@/assets/gift_chiikawa.jpeg'
import giftKodakCharmera from '@/assets/gift_kodak_charmera.jpg'

export interface Card {
  id: string
  giftName: string
  giftImage?: string
  giftText?: string
  isOpened: boolean
}

// 隨機打亂陣列（Fisher-Yates 洗牌算法）
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const useCardStore = defineStore('card', () => {
  // 所有卡片（包含最後一個特殊卡片）
  const allCards: Card[] = [
    {
      id: '1',
      giftName: 'Benkoff Cafe Sauschestra 臘腸狗盲盒',
      giftImage: giftDog,
      isOpened: false,
    },
    {
      id: '2',
      giftName: 'Benkoff Cafe Sauschestra 臘腸狗盲盒 - 聖誕款',
      giftImage: giftDogChristmas,
      isOpened: false,
    },
    { id: '3', giftName: 'Chiikawa 麵包古本屋', giftImage: giftChiikawa, isOpened: false },
    { id: '4', giftName: 'Kodak Charmera 相機盲盒', giftImage: giftKodakCharmera, isOpened: false },
    {
      id: '5',
      giftName: '帶妳去挑禮物',
      giftText: '帶妳去挑禮物\n$3000\n衣服或鞋子',
      isOpened: false,
    },
  ]

  // 分離出最後一個特殊卡片和其他卡片
  const specialCard = allCards.find((card) => card.id === '5')
  const otherCards = allCards.filter((card) => card.id !== '5')

  // 隨機打亂其他卡片，然後將特殊卡片放在最後
  const shuffledCards = [...shuffleArray(otherCards)]
  if (specialCard) {
    shuffledCards.push(specialCard)
  }

  // 卡片列表（隨機順序，但 "帶妳去挑禮物" 一定在最後）
  const cards = ref<Card[]>(shuffledCards)

  // 計算是否所有卡片都已開啟
  const allCardsOpened = computed(() => {
    return cards.value.every((card) => card.isOpened)
  })

  // 計算其他卡片（除了 id='5'）是否都已開啟
  const otherCardsOpened = computed(() => {
    return cards.value.filter((card) => card.id !== '5').every((card) => card.isOpened)
  })

  // 獲取可顯示的卡片列表（如果其他卡片都開啟了，才包含 id='5'）
  const visibleCards = computed(() => {
    if (otherCardsOpened.value) {
      // 其他卡片都開啟了，顯示所有卡片
      return cards.value
    } else {
      // 其他卡片還沒全部開啟，隱藏 id='5' 的卡片
      return cards.value.filter((card) => card.id !== '5')
    }
  })

  // 開啟卡片
  function openCard(cardId: string) {
    const card = cards.value.find((c) => c.id === cardId)
    if (!card) return

    // 如果嘗試開啟 id='5' 的卡片，需要先檢查其他卡片是否都已開啟
    if (card.id === '5' && !otherCardsOpened.value) {
      // 其他卡片還沒全部開啟，不允許開啟這張卡片
      return
    }

    card.isOpened = true
  }

  // 重置所有卡片
  function resetCards() {
    cards.value.forEach((card) => {
      card.isOpened = false
    })
  }

  return {
    cards,
    visibleCards,
    allCardsOpened,
    otherCardsOpened,
    openCard,
    resetCards,
  }
})
