import { createApp } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
import './style.css'
import App from './App.vue'

createApp(App).use(ui).mount('#app')
