import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import { resolve } from 'path';

const pathResolve = (dir) => resolve(__dirname, dir);

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000 // 你想要的端口号
  },
  plugins: [
    vue(),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
    AutoImport({
      resolvers: [NaiveUiResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': pathResolve('./src'), // 设置 `@` 指向 `src` 目录
    },
  },
})
