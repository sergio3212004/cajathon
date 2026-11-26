import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import ui from '@nuxt/ui/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), ui({ router: false, colorMode: false, ui: { colors: { primary: 'red', neutral: 'slate' } }, icon: { clientBundle: { scan: true } } })],
})
