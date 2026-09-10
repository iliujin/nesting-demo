import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const local = loadEnv(mode, '.', 'NESTING_DEV_')
  return {
    plugins: [vue(), {
      name: 'local-solver-config',
      configureServer(server) {
        const apiBaseUrl = local.NESTING_DEV_API_URL
        if (!apiBaseUrl) return
        server.middlewares.use('/nesting-demo/config.json', (_request, response) => {
          response.setHeader('Content-Type', 'application/json')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify({ schemaVersion: 1, mode: 'live', apiBaseUrl }))
        })
      },
    }],
    base: '/nesting-demo/',
    build: { sourcemap: false },
  }
})
