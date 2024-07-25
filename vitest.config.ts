import { resolve as _resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const resolve = (p: string) => _resolve(__dirname, p)

export default defineConfig({
  resolve: {
    alias: {
      vue2: resolve('src/vue2'),
      vue3: resolve('src/vue3'),
      types2: resolve('src/vue2/types'),
      types3: resolve('src/vue3/types'),
      utils2: resolve('src/vue2/utils'),
      utils3: resolve('src/vue3/utils'),
      helpers2: resolve('src/vue2/helpers'),
      helpers3: resolve('src/vue3/helpers'),
      compiler: resolve('src/compiler'),
    },
  },
  define: {
    __DEV__: true,
    __TEST__: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: resolve('test/vitest.setup.ts'),
  },
})
