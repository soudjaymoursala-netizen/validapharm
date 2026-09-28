import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { useErreursGlobalesStore } from './stores/useErreursGlobalesStore'
import './styles/fonts.css'
import './styles/tokens.css'

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)

// Filet global (audit d'intégrité M1) : une erreur non gérée par l'écran
// (gestionnaire d'événement, sauvegarde lancée sans attendre) est affichée
// dans un bandeau, jamais seulement dans la console.
const erreursGlobales = useErreursGlobalesStore(pinia)
app.config.errorHandler = (erreur) => {
  console.error(erreur)
  erreursGlobales.signaler(erreur)
}
window.addEventListener('unhandledrejection', (evenement) => {
  erreursGlobales.signaler(evenement.reason)
})

app.mount('#app')
