import { defineBuildConfig } from 'unbuild'
import tsconfigPaths from 'rollup-plugin-tsconfig-paths'

export default defineBuildConfig({
  entries: [
    'src/index',
  ],
  declaration: true,
  clean: true,
  // rollup 配置并没有提供 plugins 配置, 所以需要通过 hooks 来实现
  hooks: {
    'rollup:options': (ctx, options) => {
      // 读取 tsconfig.json 中的 paths 配置
      options.plugins = Array.isArray(options.plugins)
        ? [...options.plugins, tsconfigPaths()]
        : [tsconfigPaths()]
    },
  },
  rollup: {
    emitCJS: true,
    // 内联依赖, 默认 false
    inlineDependencies: true,
  },
})
