<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCardStore } from '@/stores/cardStore'
import type { Card } from '@/stores/cardStore'

defineOptions({
  name: 'CardPack',
})

interface Props {
  card: Card
  index: number
  currentIndex: number | null
  singleCardMode?: boolean
}

const props = defineProps<Props>()
const cardStore = useCardStore()

// 判斷是否為當前顯示的卡片
const isCurrent = computed(() => props.index === props.currentIndex)

// 狀態機：idle → hover → press → tear → open → reveal → done
const packState = ref<'idle' | 'hover' | 'press' | 'tear' | 'open' | 'reveal' | 'done'>('idle')

// 滑鼠位置（用於 tilt 效果）
const mouseX = ref(0.5) // 0-1
const mouseY = ref(0.5) // 0-1
const packElement = ref<HTMLElement | null>(null)

// 觸控相關（用於撕開）
const touchStartX = ref(0)
const touchStartY = ref(0)
const tearProgress = ref(0) // 0-100

// 計算 tilt 角度
const tiltX = computed(() => (mouseY.value - 0.5) * 20) // ±10deg
const tiltY = computed(() => (mouseX.value - 0.5) * 28) // ±14deg

// 處理滑鼠移動（hover tilt）
function handleMouseMove(e: MouseEvent) {
  if (!packElement.value || !props.singleCardMode || props.card.isOpened) return

  // 如果正在拖曳撕開，優先處理撕開
  if (isMouseDown) {
    handleMouseMoveForTear(e)
    return
  }

  const rect = packElement.value.getBoundingClientRect()
  mouseX.value = (e.clientX - rect.left) / rect.width
  mouseY.value = (e.clientY - rect.top) / rect.height

  // 更新 CSS variables
  if (packElement.value) {
    packElement.value.style.setProperty('--mx', mouseX.value.toString())
    packElement.value.style.setProperty('--my', mouseY.value.toString())
  }

  if (packState.value === 'idle') {
    packState.value = 'hover'
  }
}

function handleMouseLeave() {
  handleMouseUpForTear()

  if (packState.value === 'hover' || packState.value === 'press') {
    packState.value = 'idle'
  }
  mouseX.value = 0.5
  mouseY.value = 0.5
}

// 滑鼠按下（用於拖曳撕開）
let isMouseDown = false
let mouseStartX = 0

function handleMouseDownForTear(e: MouseEvent) {
  if (props.card.isOpened || !props.singleCardMode || !isCurrent.value) return

  if (packElement.value) {
    const rect = packElement.value.getBoundingClientRect()
    mouseStartX = e.clientX

    // 檢查是否在撕開線附近
    const mouseY = e.clientY - rect.top
    const tearLineY = rect.height / 6

    if (Math.abs(mouseY - tearLineY) < 50) {
      isMouseDown = true
      packState.value = 'press'
    }
  }
}

function handleMouseMoveForTear(e: MouseEvent) {
  if (!isMouseDown || !packElement.value) return

  const rect = packElement.value.getBoundingClientRect()
  const deltaX = e.clientX - mouseStartX
  const mouseY = e.clientY - rect.top
  const tearLineY = rect.height / 6

  // 確保在撕開線附近且向右滑動
  if (Math.abs(mouseY - tearLineY) < 50 && deltaX > 0) {
    if (packState.value === 'press') {
      packState.value = 'tear'
    }

    // 計算撕開進度（需要滑動整個寬度的80%才算完成）
    const maxTear = rect.width * 0.8
    tearProgress.value = Math.min(100, (deltaX / maxTear) * 100)

    // 如果滑到底（達到90%以上），完成撕開
    if (tearProgress.value >= 90 && packState.value === 'tear') {
      completeTear()
    }
  }
}

function handleMouseUpForTear() {
  if (isMouseDown) {
    isMouseDown = false

    // 如果沒滑到底，回彈
    if (packState.value === 'tear' && tearProgress.value < 90) {
      packState.value = 'idle'
      tearProgress.value = 0
    } else if (packState.value === 'press') {
      packState.value = 'idle'
    }
  }
}

// 完成撕開
function completeTear() {
  packState.value = 'open'
  tearProgress.value = 100

  // 0.8s 後進入 reveal 狀態
  setTimeout(() => {
    packState.value = 'reveal'
    cardStore.openCard(props.card.id)

    // 1.0s 後進入 done 狀態
    setTimeout(() => {
      packState.value = 'done'
    }, 1000)
  }, 800)
}

// 觸控處理（手機端）
function handleTouchStart(e: TouchEvent) {
  if (props.card.isOpened || !isCurrent.value || !props.singleCardMode) return

  const touch = e.touches[0]
  if (touch && packElement.value) {
    const rect = packElement.value.getBoundingClientRect()
    touchStartX.value = touch.clientX
    touchStartY.value = touch.clientY

    // 檢查是否在撕開線附近
    const touchY = touch.clientY - rect.top
    const tearLineY = rect.height / 6

    if (Math.abs(touchY - tearLineY) < 50) {
      packState.value = 'press'
    }
  }
}

function handleTouchMove(e: TouchEvent) {
  if (packState.value !== 'press' && packState.value !== 'tear') return

  const touch = e.touches[0]
  if (!touch || !packElement.value) return

  const cardRect = packElement.value.getBoundingClientRect()
  const deltaX = touch.clientX - touchStartX.value
  const touchY = touch.clientY - cardRect.top
  const tearLineY = cardRect.height / 6

  // 只在撕開線附近且向右滑動時才觸發
  if (Math.abs(touchY - tearLineY) < 50 && deltaX > 0) {
    e.preventDefault()

    if (packState.value === 'press') {
      packState.value = 'tear'
    }

    // 計算撕開進度（需要滑動整個寬度的80%才算完成）
    const maxTear = cardRect.width * 0.8
    tearProgress.value = Math.min(100, (deltaX / maxTear) * 100)

    // 如果滑到底（達到90%以上），完成撕開
    if (tearProgress.value >= 90 && packState.value === 'tear') {
      completeTear()
    }
  }
}

function handleTouchEnd() {
  // 如果沒滑到底，回彈
  if (packState.value === 'tear' && tearProgress.value < 90) {
    packState.value = 'idle'
    tearProgress.value = 0
  } else if (packState.value === 'press') {
    packState.value = 'idle'
  }

  touchStartX.value = 0
  touchStartY.value = 0
}

onMounted(() => {
  if (packElement.value) {
    packElement.value.style.setProperty('--mx', '0.5')
    packElement.value.style.setProperty('--my', '0.5')
  }
})

// 根據狀態計算 CSS class
const packClasses = computed(() => {
  return {
    [`state-${packState.value}`]: true,
    'is-opened': props.card.isOpened,
  }
})
</script>

<template>
  <div ref="packElement" class="pack-scene" :class="packClasses" :data-state="packState" :style="{
    '--tilt-x': `${tiltX}deg`,
    '--tilt-y': `${tiltY}deg`,
    '--tear-progress': `${tearProgress}%`,
  }" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave" @mousedown="handleMouseDownForTear"
    @mouseup="handleMouseUpForTear" @touchstart="handleTouchStart" @touchmove="handleTouchMove"
    @touchend="handleTouchEnd">
    <div class="pack" :class="packClasses">
      <!-- 卡包背面 -->
      <div class="pack-back"></div>

      <!-- 卡包側面（厚度） -->
      <div class="pack-side pack-side-top"></div>
      <div class="pack-side pack-side-bottom"></div>
      <div class="pack-side pack-side-left"></div>
      <div class="pack-side pack-side-right"></div>

      <!-- 卡包正面 -->
      <div class="pack-front">
        <div class="pack-content">
          <div class="pack-pattern"></div>
          <div class="pack-label">禮物卡包</div>
        </div>

        <!-- 塑膠膜反光層 -->
        <div class="pack-shine"></div>

        <!-- 破口效果（tear 時顯示） -->
        <div class="pack-tear-hole"></div>
      </div>

      <!-- 封條/撕開線（前1/6處） -->
      <div class="pack-seal"></div>

      <!-- 內部光溢出 -->
      <div class="pack-inner-glow"></div>

      <!-- 卡片（初始藏在包內） -->
      <div class="pack-card">
        <div class="card-content">
          <div class="gift-icon">🎁</div>
          <div class="gift-name">{{ card.giftName }}</div>
          <!-- 高光掃過效果 -->
          <div class="card-shine"></div>
        </div>
      </div>
    </div>

    <!-- Popup 卡片（reveal 後顯示） -->
    <div class="card-popup" :class="{ show: packState === 'reveal' || packState === 'done' }">
      <div class="popup-card">
        <div class="popup-content">
          <div class="gift-icon-large">🎁</div>
          <div class="gift-name-large">{{ card.giftName }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Pack Scene - Perspective Container */
.pack-scene {
  width: 240px;
  height: 340px;
  perspective: 1200px;
  position: relative;
  cursor: pointer;
  /* 基準尺寸：240px * 340px (768px 以上) */
}

/* Pack - 3D Container */
.pack {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
  transition: transform 0.1s ease-out;
}

/* Idle 浮動動畫 */
.pack-scene.state-idle .pack {
  animation: idleFloat 3s ease-in-out infinite;
}

@keyframes idleFloat {

  0%,
  100% {
    transform: rotateX(0deg) rotateY(0deg) translateY(0);
  }

  50% {
    transform: rotateX(2deg) rotateY(2deg) translateY(-5px);
  }
}

/* Hover 狀態 */
.pack-scene.state-hover .pack {
  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) scale(1.05);
}

/* Press 狀態 */
.pack-scene.state-press .pack {
  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) scale(0.98);
}

/* Tear 狀態 */
.pack-scene.state-tear .pack {
  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) scale(1.02);
}

/* Open 狀態 */
.pack-scene.state-open .pack {
  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) scale(1);
}

/* 卡包背面 */
.pack-back {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  border-radius: 12px;
  transform: translateZ(-8px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

/* 卡包側面（厚度） */
.pack-side {
  position: absolute;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.8;
}

.pack-side-top {
  width: 100%;
  height: 8px;
  top: 0;
  transform: rotateX(90deg) translateZ(4px);
  transform-origin: top center;
}

.pack-side-bottom {
  width: 100%;
  height: 8px;
  bottom: 0;
  transform: rotateX(-90deg) translateZ(4px);
  transform-origin: bottom center;
}

.pack-side-left {
  width: 8px;
  height: 100%;
  left: 0;
  transform: rotateY(-90deg) translateZ(4px);
  transform-origin: left center;
}

.pack-side-right {
  width: 8px;
  height: 100%;
  right: 0;
  transform: rotateY(90deg) translateZ(4px);
  transform-origin: right center;
}

/* 卡包正面 */
.pack-front {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  transform: translateZ(4px);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  backface-visibility: hidden;
}

.pack-content {
  width: 100%;
  height: calc(100% - 16.67%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: calc(100% / 6);
  position: relative;
  z-index: 1;
}

.pack-pattern {
  width: 85%;
  height: 70%;
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  background: repeating-linear-gradient(45deg,
      transparent,
      transparent 12px,
      rgba(255, 255, 255, 0.15) 12px,
      rgba(255, 255, 255, 0.15) 24px);
  margin-bottom: 15px;
}

.pack-label {
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

/* 塑膠膜反光層 */
.pack-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 30%,
      rgba(255, 255, 255, 0.3) 50%,
      rgba(255, 255, 255, 0.1) 70%,
      transparent 100%);
  opacity: 0;
  pointer-events: none;
  transform-origin: center;
  transition: opacity 0.3s, transform 0.1s;
  z-index: 2;
}

/* 反光隨 tilt 移動 */
.pack-scene.state-hover .pack-shine,
.pack-scene.state-press .pack-shine {
  opacity: 1;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 100%),
      calc((var(--my, 0.5) - 0.5) * 100%)) rotate(calc((var(--mx, 0.5) - 0.5) * 20deg));
}

/* 封條/撕開線（前1/6處） */
.pack-seal {
  position: absolute;
  top: calc(100% / 6);
  left: 0;
  right: 0;
  height: 6px;
  transform: translateY(-50%) translateZ(5px);
  z-index: 10;
  background: linear-gradient(to right,
      transparent 0%,
      rgba(255, 255, 255, 0.9) 20%,
      rgba(255, 255, 255, 0.9) 80%,
      transparent 100%);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Tear 動畫 - 撕開封條 */
.pack-scene.state-tear .pack-seal {
  clip-path: polygon(0 0,
      var(--tear-progress, 0%) 0,
      calc(var(--tear-progress, 0%) - 4px) 20%,
      var(--tear-progress, 0%) 40%,
      calc(var(--tear-progress, 0%) - 3px) 60%,
      var(--tear-progress, 0%) 80%,
      calc(var(--tear-progress, 0%) - 2px) 100%,
      0 100%);
  opacity: calc(1 - var(--tear-progress, 0) / 100);
}

.pack-scene.state-open .pack-seal,
.pack-scene.state-reveal .pack-seal,
.pack-scene.state-done .pack-seal {
  opacity: 0;
  transform: translateY(-50%) translateZ(5px) scaleX(0);
}

/* 破口效果 */
.pack-tear-hole {
  position: absolute;
  top: calc(100% / 6);
  left: 0;
  right: 0;
  height: 0;
  transform: translateY(-50%) translateZ(4.5px);
  z-index: 5;
  background: transparent;
  opacity: 0;
  transition: height 0.45s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  /* 創建不規則的破口邊緣 */
  clip-path: polygon(0 0,
      100% 0,
      100% 20%,
      98% 40%,
      100% 60%,
      97% 80%,
      100% 100%,
      0 100%,
      0 80%,
      2% 60%,
      0 40%,
      3% 20%);
}

/* Tear 時顯示破口 */
.pack-scene.state-tear .pack-tear-hole {
  height: 20px;
  opacity: 1;
  background: linear-gradient(to bottom,
      rgba(0, 0, 0, 0.3) 0%,
      transparent 50%,
      rgba(0, 0, 0, 0.2) 100%);
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 0 10px rgba(255, 200, 100, 0.3);
}

.pack-scene.state-open .pack-tear-hole,
.pack-scene.state-reveal .pack-tear-hole,
.pack-scene.state-done .pack-tear-hole {
  height: 100%;
  opacity: 0.8;
  background: linear-gradient(to bottom,
      transparent 0%,
      rgba(255, 200, 100, 0.2) 20%,
      transparent 100%);
}

/* 內部光溢出 */
.pack-inner-glow {
  position: absolute;
  top: calc(100% / 6);
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at center,
      rgba(255, 255, 255, 0.4) 0%,
      rgba(255, 200, 100, 0.3) 30%,
      transparent 70%);
  opacity: 0;
  transform: translateZ(3px);
  z-index: 1;
  transition: opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.pack-scene.state-open .pack-inner-glow,
.pack-scene.state-reveal .pack-inner-glow {
  opacity: 1;
  animation: glowPulse 1s ease-in-out infinite;
}

@keyframes glowPulse {

  0%,
  100% {
    opacity: 0.6;
    transform: translateZ(3px) scale(1);
  }

  50% {
    opacity: 1;
    transform: translateZ(3px) scale(1.1);
  }
}

/* 卡片（初始藏在包內） */
.pack-card {
  position: absolute;
  width: 90%;
  height: 60%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) translateZ(2px) rotateY(180deg);
  transform-origin: center center;
  opacity: 0;
  z-index: 0;
  transition: none;
  /* 確保初始狀態完全隱藏且居中 */
  visibility: hidden;
}

/* 確保在 tear 和 open 狀態時卡片仍然隱藏 */
.pack-scene.state-idle .pack-card,
.pack-scene.state-hover .pack-card,
.pack-scene.state-press .pack-card,
.pack-scene.state-tear .pack-card,
.pack-scene.state-open .pack-card {
  visibility: hidden;
  opacity: 0;
}

.card-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.gift-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.gift-name {
  font-size: 24px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

/* Reveal 動畫 - 卡片滑出並轉正 */
.pack-scene.state-reveal .pack-card {
  opacity: 1;
  transform: translate(-50%, -50%) translateZ(200px) rotateY(0deg) scale(1.2);
  animation: cardReveal 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes cardReveal {
  0% {
    transform: translate(-50%, -50%) translateZ(2px) rotateY(180deg) scale(0.9);
    opacity: 0;
    visibility: visible;
  }

  30% {
    transform: translate(-50%, -50%) translateZ(100px) rotateY(90deg) scale(1);
    opacity: 0.6;
  }

  60% {
    transform: translate(-50%, -50%) translateZ(180px) rotateY(45deg) scale(1.1);
    opacity: 0.9;
  }

  100% {
    transform: translate(-50%, -50%) translateZ(200px) rotateY(0deg) scale(1.2);
    opacity: 1;
  }
}

/* 高光掃過卡面 */
.card-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.6) 50%,
      transparent 100%);
  opacity: 0;
  pointer-events: none;
}

.pack-scene.state-reveal .card-shine {
  animation: shineSweep 1s ease-out 0.5s forwards;
}

@keyframes shineSweep {
  0% {
    left: -100%;
    opacity: 0;
  }

  50% {
    opacity: 1;
  }

  100% {
    left: 100%;
    opacity: 0;
  }
}

/* Popup 卡片 */
.card-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.5);
  background: rgba(0, 0, 0, 0);
  transition: opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.4s ease;
}

.card-popup.show {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.7);
}

.popup-card {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 20px;
  padding: 40px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 10px 30px rgba(0, 0, 0, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  border: 3px solid rgba(255, 255, 255, 0.3);
  min-width: 300px;
  max-width: 90vw;
  animation: popupBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
}

.popup-content {
  text-align: center;
  color: white;
}

.gift-icon-large {
  font-size: 80px;
  margin-bottom: 20px;
  animation: iconBounce 0.8s ease-out 0.4s both;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.gift-name-large {
  font-size: 36px;
  font-weight: bold;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.4);
  animation: nameFadeIn 0.6s ease-out 0.6s both;
}

@keyframes popupBounce {
  0% {
    transform: scale(0.3) translateY(100px);
    opacity: 0;
  }

  50% {
    transform: scale(1.1) translateY(-10px);
  }

  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes iconBounce {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }

  60% {
    transform: scale(1.2) rotate(10deg);
  }

  80% {
    transform: scale(0.9) rotate(-5deg);
  }

  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes nameFadeIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .pack-scene {
    width: calc(240px * (100vw / 768));
    height: calc(340px * (100vw / 768));
    min-width: 125px;
    min-height: 177px;
  }

  .pack-label {
    font-size: clamp(12px, calc(18px * (100vw / 768)), 18px);
  }

  .gift-icon {
    font-size: clamp(32px, calc(48px * (100vw / 768)), 48px);
  }

  .gift-name {
    font-size: clamp(18px, calc(24px * (100vw / 768)), 24px);
  }

  .popup-card {
    padding: 30px;
    min-width: 250px;
  }

  .gift-icon-large {
    font-size: 60px;
    margin-bottom: 15px;
  }

  .gift-name-large {
    font-size: 28px;
  }
}
</style>
