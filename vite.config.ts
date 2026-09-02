import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

/* Los iconos animados vienen en un solo módulo con los 512 dibujos
   dentro, y cada uno se declara en dos tiempos:

     var om = forwardRef((props, ref) => { … })
     om.displayName = "AArrowDownIcon"

   Ninguno de los dos se puede tirar sin ayuda. La llamada, porque
   Rollup no sabe si `forwardRef` hace algo más que devolver un
   componente. Y la asignación, porque escribir una propiedad sobre un
   valor de origen desconocido podría estar disparando un `setter`.
   Basta con que quede uno de los dos para que el icono entero se
   quede, y como pasa con los 512, se quedan todos: la aplicación usa
   63 y el paquete final se los llevaba enteros.

   Medido acá, importando un solo icono:

     tal cual .................. 894 kB
     solo la anotación pura .... 901 kB
     solo sin displayName ...... 875 kB
     las dos cosas .............. 75 kB   ← una décima parte

   Hay que hacer las dos. Cualquiera por separado no mueve nada,
   porque la que queda sigue anclando la declaración.

   Que esto sea legítimo no lo decidimos nosotros: el paquete ya
   declara `"sideEffects": false`, o sea que promete justo esto. Lo
   único que falta es decírselo a Rollup en el idioma que entiende.

   Lo que se pierde es el nombre del icono en las herramientas de
   React. Poco: el envoltorio de `src/lib/iconos.tsx` pone el suyo, así
   que en el árbol de componentes igual se lee algo. */
const iconosSacudibles = (): Plugin => ({
  name: 'iconos-animados-puros',
  enforce: 'pre',
  transform(codigo, id) {
    if (!id.includes('@animateicons/react/dist/')) return null

    return {
      code: codigo
        .replace(/=\s*forwardRef\(/g, '=/*#__PURE__*/forwardRef(')
        .replace(/[A-Za-z0-9_$]+\.displayName\s*=\s*"[^"]*";/g, ''),
      map: null,
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), iconosSacudibles()],
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
