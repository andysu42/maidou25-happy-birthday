<script setup lang="ts">
import { computed } from 'vue'
import { useCardStore } from '@/stores/cardStore'

const cardStore = useCardStore()

// 獲取所有已開啟的卡片
const openedCards = computed(() => {
  return cardStore.cards.filter((card) => card.isOpened)
})
</script>

<template>
  <div class="gift-list-container">
    <div class="gift-list-header">
      <h2 class="list-title">🎉 郭子萱 生日快樂 🎉</h2>
      <p class="list-subtitle">恭喜妳獲得以下禮物！</p>
    </div>

    <div class="gift-list">
      <div v-for="(card, index) in openedCards" :key="card.id" class="gift-item"
        :style="{ '--delay': `${index * 0.1}s` }">
        <div class="gift-item-content">
          <div class="gift-number">{{ index + 1 }}</div>
          <!-- 圖片禮物 -->
          <div v-if="card.giftImage" class="gift-image-small">
            <img :src="card.giftImage" :alt="card.giftName" class="gift-image-thumb" />
          </div>
          <!-- 文字禮物 -->
          <div v-else class="gift-icon">🎁</div>
          <div class="gift-name">{{ card.giftName }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gift-list-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  animation: fadeInUp 0.6s ease-out;
}

.gift-list-header {
  text-align: center;
  margin-bottom: 30px;
}

.list-title {
  font-size: 32px;
  color: white;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  animation: bounceIn 0.8s ease-out;
}

.list-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.gift-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.gift-item {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transform: translateY(20px);
  animation: slideInUp 0.5s ease-out forwards;
  animation-delay: var(--delay);
  transition: transform 0.3s, box-shadow 0.3s;
}

.gift-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  background: rgba(255, 255, 255, 0.2);
}

.gift-item-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.gift-number {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.gift-icon {
  font-size: 36px;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.gift-image-small {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.gift-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gift-name {
  flex: 1;
  font-size: 20px;
  font-weight: 600;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }

  50% {
    transform: scale(1.05);
  }

  70% {
    transform: scale(0.9);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .gift-list-container {
    padding: 30px 15px;
  }

  .list-title {
    font-size: 24px;
  }

  .list-subtitle {
    font-size: 16px;
  }

  .gift-item {
    padding: 15px;
  }

  .gift-item-content {
    gap: 15px;
  }

  .gift-number {
    width: 35px;
    height: 35px;
    font-size: 16px;
  }

  .gift-icon {
    font-size: 28px;
  }

  .gift-image-small {
    width: 50px;
    height: 50px;
  }

  .gift-name {
    font-size: 18px;
  }
}
</style>
