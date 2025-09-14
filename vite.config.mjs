import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        admin: path.resolve(__dirname, 'apps/admin/index.html'),
        backoffice: path.resolve(__dirname, 'apps/database/index.html'),
        user: path.resolve(__dirname, 'apps/user/index.html'),
        dated: path.relative(__dirname, 'apps/dated/index.html'),
        uplode: path.relative(__dirname, 'apps/uplode/index.html'),
        backend: path.relative(__dirname, 'apps/backend/index.html'),
      }
    }
  },
  // server: {
  //   open: '/apps/admin/index.html'
  // }
})