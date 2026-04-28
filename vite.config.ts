import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { compression } from 'vite-plugin-compression2'

/**
 * 将 node_modules 按体积与更新频率拆块，首屏可并行拉取、长期缓存更稳
 */
function manualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return
  }
  // UI 库单独一块，体量大、业务代码常变
  if (id.includes('naive-ui')) {
    return 'naive'
  }
  // 图床/轮播/编辑器相关，可与其他依赖并行下载
  if (id.includes('embla-carousel')) {
    return 'embla'
  }
  if (id.includes('@pqina/pintura')) {
    return 'pintura'
  }
  if (id.includes('filepond') || id.includes('vue-filepond')) {
    return 'filepond'
  }
  if (id.includes('@tma.js')) {
    return 'telegram'
  }
  if (id.includes('axios')) {
    return 'axios'
  }
  if (id.includes('@iconify')) {
    return 'iconify'
  }
  // Vue 生态与运行时放一块，保证 dedupe、缓存友好
  if (id.includes('node_modules/pinia')) {
    return 'framework'
  }
  if (id.includes('node_modules/vue-router')) {
    return 'framework'
  }
  if (id.includes('node_modules/vue/')) {
    return 'framework'
  }
  if (id.includes('@vue/')) {
    return 'framework'
  }
  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig((): UserConfig => ({
  plugins: [
    vue(),
    UnoCSS(),
    AutoImport({
      imports: ['vue', 'vue-router'],
      dirs: ['src/composables', 'src/utils'],
      dts: './auto-imports.d.ts',
      vueTemplate: true,
    }),
    Components({
      dirs: ['src/components'],
      resolvers: [NaiveUiResolver()],
      dts: './components.d.ts',
    }),
    // 产物旁生成 .gz / .br，需静态服务器配 Content-Encoding 或 Nginx 直接提供 .br
    compression({
      algorithms: ['gzip', 'brotliCompress'],
      threshold: 5 * 1024,
      deleteOriginalAssets: false,
      skipIfLargerOrEqual: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // 多路径引入时保证单例
    dedupe: ['vue'],
  },
  optimizeDeps: {
    // 预构建这些入口，冷启动与首次访问更快
    include: [
      'vue',
      'vue-router',
      'pinia',
      'naive-ui',
      '@iconify/vue',
    ],
  },
  build: {
    // esbuild 默认压缩对 `??` + 立即执行函数等组合会偶发产出非法 JS（动态 import 报 Unexpected token '||'）；用 terser 更稳。
    minify: 'terser',
    // 与多数现代机 WebView 对齐；过旧设备可改 es2015
    target: 'es2020',
    cssCodeSplit: true,
    // 大资源不内联成 base64，走单独请求利缓存
    assetsInlineLimit: 4096,
    // filepond / pintura / naive 单块可能 >1MB，属正常；若再超可再拆路由级动态 import
    chunkSizeWarningLimit: 1500,
    // 产物的模块依赖预取（现代浏览器减少瀑布）
    modulePreload: { polyfill: false },
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks,
        // 长缓存、文件名带 hash
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (info) => {
          const n = info.name ?? ''
          if (/\.(woff2?|ttf|otf)$/.test(n)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(n)) {
            return 'assets/images/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
}))
