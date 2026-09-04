import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './styles/fonts.css'
import './styles/tokens.css'

createApp(App).use(createPinia()).use(router).mount('#app')
