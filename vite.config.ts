import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // The stores expose dev handles on `window` at import time.
    environment: 'happy-dom',
  },
})
