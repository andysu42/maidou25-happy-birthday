<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useCardStore } from '@/stores/cardStore'
import Card from '@/components/Card.vue'
import GiftList from '@/components/GiftList.vue'

const cardStore = useCardStore()

// 當前顯示的卡片索引
const currentIndex = ref(0)

// 單卡模式狀態
const singleCardMode = ref(false)
const selectedCardIndex = ref<number | null>(null)

// 觸控相關
const touchStartX = ref(0)
const touchEndX = ref(0)
const touchStartY = ref(0)
const touchEndY = ref(0)
const isDragging = ref(false)
const dragOffset = ref(0)
const hasMoved = ref(false) // 是否已經移動（用於區分點擊和滑動）
const clickTargetIndex = ref<number | null>(null) // 點擊目標索引

// 螢幕寬度（用於響應式調整）
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920)

// 根據螢幕寬度計算 3D 環繞參數
// 基準配置（768px 以上）
// 卡片寬度 240px，所以左右卡片至少需要距離中心 120px + 安全邊距
const baseConfig = {
  radius: 350, // 大幅增加半徑，確保不重疊
  maxAngle: 50,
  opacityStep: 0.25,
  scaleStep: 0.15,
  minOpacity: 0.4,
  xOffset: 150, // 大幅增加 x 偏移量，確保左右卡片不會重疊到中間
}

const carouselConfig = computed(() => {
  const width = windowWidth.value

  // 如果寬度小於 768px，等比例縮放
  if (width <= 768) {
    // 以 400px 為基準，計算縮放比例
    // 400px 時縮放比例約為 0.52 (400/768)
    // 但為了更好的視覺效果，使用更平滑的縮放
    const scale = Math.max(0.5, width / 768)

    return {
      radius: baseConfig.radius * scale,
      maxAngle: baseConfig.maxAngle, // 角度保持不變
      opacityStep: baseConfig.opacityStep, // 透明度變化保持不變
      scaleStep: baseConfig.scaleStep, // 縮放變化保持不變
      minOpacity: baseConfig.minOpacity, // 最小透明度保持不變
      xOffset: baseConfig.xOffset * scale, // x 偏移等比例縮放
    }
  }

  // 768px 以上使用基準配置
  return {
    ...baseConfig,
  }
})

// 更新視窗寬度
function updateWindowWidth() {
  windowWidth.value = window.innerWidth
}

// 進入單卡模式
function enterSingleCardMode(index: number) {
  if (cardStore.cards[index].isOpened) return // 已開啟的卡片不能進入單卡模式
  selectedCardIndex.value = index
  singleCardMode.value = true
}

// 退出單卡模式
function exitSingleCardMode() {
  singleCardMode.value = false
  selectedCardIndex.value = null
}

// 計算每張卡片的旋轉角度和位置
const getCardStyle = (index: number) => {
  // 單卡模式下，只顯示選中的卡片
  if (singleCardMode.value) {
    if (index === selectedCardIndex.value) {
      return {
        transform: 'translateX(0) translateZ(0) rotateY(0deg) scale(1)',
        opacity: 1,
        zIndex: 100,
        pointerEvents: 'auto',
      }
    } else {
      return {
        transform: 'translateX(0) translateZ(0) rotateY(0deg) scale(1)',
        opacity: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }
    }
  }

  // 正常模式下的計算
  const totalCards = cardStore.cards.length
  const offset = index - currentIndex.value
  const config = carouselConfig.value

  // 處理循環
  let normalizedOffset = offset
  if (normalizedOffset > totalCards / 2) {
    normalizedOffset -= totalCards
  } else if (normalizedOffset < -totalCards / 2) {
    normalizedOffset += totalCards
  }

  // 限制只顯示左右各一張（offset = -1, 0, 1）
  // 其他卡片隱藏或顯示在更遠的位置
  const absOffset = Math.abs(normalizedOffset)

  // 計算角度：使用固定的最大角度，而不是 360/totalCards
  // 左右各一張卡片，所以角度是 -maxAngle, 0, maxAngle
  const baseAngle = (normalizedOffset / Math.max(1, absOffset)) * config.maxAngle * Math.min(1, absOffset)
  const angle = baseAngle + dragOffset.value * 0.3

  // 計算位置：使用角度來計算 x 和 z
  // 增加額外的 x 偏移，確保左右卡片不會插進中間
  const angleRad = (baseAngle * Math.PI) / 180
  const z = Math.cos(angleRad) * config.radius - config.radius

  // 計算基礎 x 位置
  const baseX = Math.sin(angleRad) * config.radius

  // 增加額外的 x 偏移量，讓左右卡片離中心更遠
  // 當 absOffset > 0 時，需要額外的偏移來避免重疊
  const additionalXOffset = absOffset > 0 ? (normalizedOffset > 0 ? 1 : -1) * config.xOffset : 0

  const x = baseX + additionalXOffset

  // 計算透明度和縮放
  const opacity = absOffset === 0 ? 1 : 1 - absOffset * config.opacityStep
  const scale = absOffset === 0 ? 1 : 1 - absOffset * config.scaleStep

  // 只顯示當前卡片和左右各一張
  const shouldShow = absOffset <= 1

  return {
    transform: `translateX(${x}px) translateZ(${z}px) rotateY(${angle}deg) scale(${scale})`,
    opacity: shouldShow ? Math.max(config.minOpacity, opacity) : 0,
    zIndex: totalCards - absOffset,
    pointerEvents: shouldShow ? 'auto' : 'none',
  }
}

// 切換到下一張
function nextCard() {
  if (currentIndex.value < cardStore.cards.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
}

// 切換到上一張
function prevCard() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = cardStore.cards.length - 1
  }
}

// 觸控開始
function handleTouchStart(e: TouchEvent) {
  // 單卡模式下不處理滑動切換
  if (singleCardMode.value) return

  if (e.touches[0]) {
    touchStartX.value = e.touches[0].clientX
    touchStartY.value = e.touches[0].clientY
    touchEndX.value = touchStartX.value
    touchEndY.value = touchStartY.value
    isDragging.value = true
    hasMoved.value = false

    // 找到點擊的卡片索引
    const target = e.target as HTMLElement
    const cardWrapper = target.closest('.card-wrapper') as HTMLElement
    if (cardWrapper) {
      const index = Array.from(cardWrapper.parentElement?.children || []).indexOf(cardWrapper)
      clickTargetIndex.value = index >= 0 ? index : null
    } else {
      clickTargetIndex.value = null
    }
  }
}

// 觸控移動
function handleTouchMove(e: TouchEvent) {
  // 單卡模式下不處理滑動切換
  if (singleCardMode.value) return

  if (!isDragging.value || !e.touches[0]) return

  touchEndX.value = e.touches[0].clientX
  touchEndY.value = e.touches[0].clientY

  const deltaX = Math.abs(touchEndX.value - touchStartX.value)
  const deltaY = Math.abs(touchEndY.value - touchStartY.value)

  // 如果移動距離超過閾值，視為滑動
  if (deltaX > 10 || deltaY > 10) {
    hasMoved.value = true
  }

  dragOffset.value = touchEndX.value - touchStartX.value
}

// 觸控結束
function handleTouchEnd() {
  // 單卡模式下不處理滑動切換
  if (singleCardMode.value) {
    isDragging.value = false
    hasMoved.value = false
    clickTargetIndex.value = null
    return
  }

  if (!isDragging.value) return

  const diff = touchEndX.value - touchStartX.value
  const threshold = 50 // 滑動閾值

  // 如果沒有移動或移動距離很小，視為點擊
  if (!hasMoved.value || (Math.abs(diff) < threshold && Math.abs(touchEndY.value - touchStartY.value) < threshold)) {
    // 觸發點擊事件
    if (clickTargetIndex.value !== null && clickTargetIndex.value >= 0) {
      const card = cardStore.cards[clickTargetIndex.value]
      if (!card.isOpened) {
        enterSingleCardMode(clickTargetIndex.value)
      }
    }
  } else if (Math.abs(diff) > threshold) {
    // 滑動切換卡片
    if (diff > 0) {
      prevCard()
    } else {
      nextCard()
    }
  }

  isDragging.value = false
  hasMoved.value = false
  clickTargetIndex.value = null
  dragOffset.value = 0
}

// 滑鼠拖曳（桌面端）
let mouseStartX = 0
let mouseStartY = 0
let mouseEndX = 0
let mouseEndY = 0
let isMouseDragging = false
let hasMouseMoved = false
let mouseClickTargetIndex: number | null = null

function handleMouseDown(e: MouseEvent) {
  mouseStartX = e.clientX
  mouseStartY = e.clientY
  mouseEndX = mouseStartX
  mouseEndY = mouseStartY
  isMouseDragging = true
  hasMouseMoved = false

  // 找到點擊的卡片索引
  const target = e.target as HTMLElement
  const cardWrapper = target.closest('.card-wrapper') as HTMLElement
  if (cardWrapper) {
    const index = Array.from(cardWrapper.parentElement?.children || []).indexOf(cardWrapper)
    mouseClickTargetIndex = index >= 0 ? index : null
  } else {
    mouseClickTargetIndex = null
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isMouseDragging) return

  mouseEndX = e.clientX
  mouseEndY = e.clientY

  const deltaX = Math.abs(mouseEndX - mouseStartX)
  const deltaY = Math.abs(mouseEndY - mouseStartY)

  // 如果移動距離超過閾值，視為拖曳
  if (deltaX > 10 || deltaY > 10) {
    hasMouseMoved = true
  }

  dragOffset.value = mouseEndX - mouseStartX
}

function handleMouseUp() {
  if (!isMouseDragging) return

  const diff = mouseEndX - mouseStartX
  const threshold = 50

  // 如果沒有移動或移動距離很小，視為點擊
  if (!hasMouseMoved || (Math.abs(diff) < threshold && Math.abs(mouseEndY - mouseStartY) < threshold)) {
    // 觸發點擊事件
    if (mouseClickTargetIndex !== null && mouseClickTargetIndex >= 0) {
      const card = cardStore.cards[mouseClickTargetIndex]
      if (!card.isOpened && !singleCardMode.value) {
        enterSingleCardMode(mouseClickTargetIndex)
      }
    }
  } else if (Math.abs(diff) > threshold) {
    // 滑動切換卡片
    if (diff > 0) {
      prevCard()
    } else {
      nextCard()
    }
  }

  isMouseDragging = false
  hasMouseMoved = false
  mouseClickTargetIndex = null
  dragOffset.value = 0
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('resize', updateWindowWidth)
  updateWindowWidth()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', updateWindowWidth)
})
</script>

<template>
  <div class="card-draw-page" :class="{ 'single-card-mode': singleCardMode }">
    <h1 v-if="!singleCardMode" class="page-title">抽卡遊戲</h1>
    <button v-if="singleCardMode" class="back-button" @click="exitSingleCardMode">
      ← 返回
    </button>
    <div class="cards-carousel" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd"
      @mousedown="handleMouseDown">
      <div class="cards-3d-container">
        <div v-for="(card, index) in cardStore.cards" :key="card.id" class="card-wrapper" :style="getCardStyle(index)">
          <Card :card="card" :index="index" :current-index="singleCardMode ? selectedCardIndex : currentIndex"
            :single-card-mode="singleCardMode" />
        </div>
      </div>
    </div>

    <!-- 獎品列表（當所有卡片都開啟時顯示） -->
    <div v-if="cardStore.allCardsOpened && !singleCardMode" class="gift-list-section">
      <GiftList />
    </div>
  </div>
</template>

<style scoped>
.card-draw-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
  position: relative;
}

.page-title {
  text-align: center;
  color: white;
  font-size: 24px;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.cards-carousel {
  width: 100%;
  height: 70vh;
  position: relative;
  perspective: 1200px;
  /* 基準 perspective (768px 以上) */
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  overflow: visible;
}

.cards-3d-container {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-wrapper {
  position: absolute;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s;
  cursor: grab;
}

.card-wrapper:active {
  cursor: grabbing;
}

.card-draw-page.single-card-mode {
  background: rgba(0, 0, 0, 0.9);
}

.back-button {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.back-button:active {
  transform: scale(0.95);
}

.gift-list-section {
  margin-top: 40px;
  padding-bottom: 40px;
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: clamp(16px, calc(24px * (100vw / 768)), 24px);
    margin-bottom: clamp(10px, calc(20px * (100vw / 768)), 20px);
  }

  .cards-carousel {
    height: 60vh;
    /* 等比例縮放 perspective，最小 500px */
    perspective: clamp(500px, calc(1200px * (100vw / 768)), 1200px);
  }

  .card-draw-page.single-card-mode .cards-carousel {
    height: 80vh;
  }

  .back-button {
    top: 15px;
    left: 15px;
    padding: 8px 16px;
    font-size: 14px;
  }

  .gift-list-section {
    margin-top: 30px;
    padding-bottom: 30px;
  }
}
</style>
