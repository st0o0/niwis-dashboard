import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
    { path: '/karte', name: 'karte', component: () => import('../views/MapView.vue') },
    { path: '/station/:id', name: 'station', component: () => import('../views/StationView.vue') },
    { path: '/vergleich', name: 'vergleich', component: () => import('../views/CompareView.vue') },
    { path: '/klima', name: 'klima', component: () => import('../views/KlimaView.vue') },
  ],
})

export default router
