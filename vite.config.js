import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      writeBundle() {
        // Copy all extension files
        const files = [
          'manifest.json',
          'background.js',
          'content.js',
          'content.css'
        ];

        files.forEach(file => {
          copyFileSync(
            resolve(__dirname, `public/${file}`),
            resolve(__dirname, `dist/${file}`)
          );
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      }
    }
  }
})
