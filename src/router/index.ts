import { createRouter, createWebHistory } from 'vue-router'
import CardDrawPage from '@/views/CardDrawPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'card-draw',
      component: CardDrawPage,
    },
  ],
})

export default router
