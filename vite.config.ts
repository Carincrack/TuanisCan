import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      /* `src/resources` es material de referencia del diseño —capturas y
         PNG pesados que nadie importa—, no código. Vigilarlo no aporta
         nada y sí rompe: en Windows, tocar uno de esos archivos mientras
         el watcher lo lee tumba el servidor con EBUSY. */
      ignored: ['**/src/resources/**'],
    },
  },
})
