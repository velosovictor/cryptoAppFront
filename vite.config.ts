import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    build: {
      // SECURITY: Disable source maps in production to prevent code exposure
      sourcemap: mode !== 'production',
    },
  }
})
