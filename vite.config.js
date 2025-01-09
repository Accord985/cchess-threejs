import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({command, isPreview}) => {
  return ({
    plugins: [react()],
    base: (command === 'build' || isPreview) ? "/cchess-threejs/" : "/",
    // base: "/cchess-threejs/",
    build: {
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: 'index.html',
        },
      }
    },
  })
})