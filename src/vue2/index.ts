import type { CompiledResult, CompilerOptions, WarningMessage } from 'types2'
import { extend, noop } from 'utils2'
import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'

/**
 * - 利用 HOP 高阶函数设计模式来解耦“核心编译逻辑”和“胶水逻辑”
 *
 * ```js
 * template
 *    |
 *    V
 * createCompilerCreator
 *    |
 *    V
 * createCompiler
 *    |
 *    V
 * compile
 *    |
 *    V
 * baseCompile
 *    |
 *    V
 * ast + render + staticRenderFns
 * ```
 *
 */
export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions,
): CompiledResult {
  // 1. 解析
  const ast = parse(template.trim(), options)

  // 2. 转换/优化
  if (options.optimize !== false) {
    optimize(ast, options)
  }

  // 3. 生成
  const code = generate(ast, options)

  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns,
  }
})

export function createCompilerCreator(baseCompile: Function): Function {
  return function createCompiler(baseOptions: CompilerOptions) {
    function compile(
      template: string,
      options?: CompilerOptions,
    ): CompiledResult {
      const finalOptions = Object.create(baseOptions)
      const errors: WarningMessage[] = []
      const tips: WarningMessage[] = []

      const warn = (
        msg: WarningMessage,
        range: { start: number, end: number },
        tip: string,
      ) => {
        ; (tip ? tips : errors).push(msg)
      }

      if (options) {
        // merge custom modules
        if (options.modules) {
          finalOptions.modules = (baseOptions.modules || []).concat(
            options.modules,
          )
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives,
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key as keyof CompilerOptions]
          }
        }
      }

      finalOptions.warn = warn
      const compiled: CompiledResult = baseCompile(template.trim(), finalOptions)
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile),
    }
  }
}

function createFunction(code: string, errors: any[]) {
  try {
    return new Function(code)
  }
  catch (err: any) {
    errors.push({ err, code })
    return noop
  }
}

interface CompiledFunctionResult {
  render: Function
  staticRenderFns: Array<Function>
}

export function createCompileToFunctionFn(compile: Function): Function {
  const cache = Object.create(null)

  return function compileToFunctions(
    template: string,
    options?: CompilerOptions,
  ): CompiledFunctionResult {
    options = extend({}, options)
    delete options.warn

    // check cache
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template
    if (cache[key]) {
      return cache[key]
    }

    // compile
    const compiled = compile(template, options)

    // turn code into functions
    const res: any = {}
    const fnGenErrors: any[] = []
    res.render = createFunction(compiled.render, fnGenErrors)
    res.staticRenderFns = compiled.staticRenderFns.map((code: string) => {
      return createFunction(code, fnGenErrors)
    })

    return (cache[key] = res)
  }
}
