import { camelize, capitalize, extend, no } from 'utils2'
import type {
  ASTAttr,
  ASTDirective,
  ASTElement,
  ASTExpression,
  ASTIfConditions,
  ASTNode,
  ASTText,
  BindingMetadata,
  CompilerOptions,
} from 'types2'
import { BindingTypes } from 'types2'
import baseDirectives from '../directives/index'
import { baseWarn, pluckModuleFunction } from '../helpers'
import { emptySlotScopeToken } from '../parser/index'
import { genHandlers } from './events'

type TransformFunction = (el: ASTElement, code: string) => string
type DataGenFunction = (el: ASTElement) => string
type DirectiveFunction = (
  el: ASTElement,
  dir: ASTDirective,
  warn: Function
) => boolean

export class CodegenState {
  options: CompilerOptions
  warn: Function
  transforms: Array<TransformFunction>
  dataGenFns: Array<DataGenFunction>
  directives: { [key: string]: DirectiveFunction }
  maybeComponent: (el: ASTElement) => boolean
  onceId: number
  staticRenderFns: Array<string>
  pre: boolean

  constructor(options: CompilerOptions) {
    this.options = options
    this.warn = options.warn || baseWarn
    this.transforms = pluckModuleFunction(options.modules, 'transformCode')
    this.dataGenFns = pluckModuleFunction(options.modules, 'genData')
    this.directives = extend(extend({}, baseDirectives), options.directives)
    const isReservedTag = options.isReservedTag || no
    this.maybeComponent = (el: ASTElement) =>
      !!el.component || !isReservedTag(el.tag)
    this.onceId = 0
    this.staticRenderFns = []
    this.pre = false
  }
}

export interface CodegenResult {
  render: string
  staticRenderFns: Array<string>
}

export function generate(
  ast: ASTElement | void,
  options: CompilerOptions,
): CodegenResult {
  // 1. 创建 CodegenState 实例
  const state = new CodegenState(options)

  // 2. 如果 ast 存在，并且 ast 的 tag 是 script，则将 code 设置为 'null'，
  // 否则调用 genElement 生成 code
  // 如果 ast 不存在，则将 code 设置为 '_c("div")'
  const code = ast
    ? ast.tag === 'script'
      ? 'null'
      : genElement(ast, state)
    : '_c("div")'

  // 3. 返回一个对象，包含渲染函数和静态渲染函数数组
  return {
    render: `with(this){return ${code}}`, // 渲染函数
    staticRenderFns: state.staticRenderFns, // 静态渲染函数数组
  }
}

export function genElement(el: ASTElement, state: CodegenState): string {
  console.log('[shun] ---> genElement - start:', el.tag)
  if (el.parent) {
    el.pre = el.pre || el.parent.pre
  }

  if (el.staticRoot && !el.staticProcessed) {
    console.log('[shun] ---> genStatic - start:', el.tag)
    const a = genStatic(el, state)
    console.log('[shun] ---> genStatic - end:', a)
    return a
  }
  else if (el.once && !el.onceProcessed) {
    console.log('[shun] ---> genOnce - start:', el.tag)
    const a = genOnce(el, state)
    console.log('[shun] ---> genOnce - end:', a)
    return a
  }
  else if (el.for && !el.forProcessed) {
    console.log('[shun] ---> genFor - start:', el)
    const a = genFor(el, state)
    console.log('[shun] ---> genFor - end:', a)
    return a
  }
  else if (el.if && !el.ifProcessed) {
    console.log('[shun] ---> genIf - start:', el.ifConditions)
    const a = genIf(el, state)
    console.log('[shun] ---> genIf - end:', a)
    return a
  }
  else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    console.log('[shun] ---> genChildren - start:', el.tag, el.slotTarget, state.pre)
    const a = genChildren(el, state) || 'void 0'
    console.log('[shun] ---> genChildren - end:', a)
    return a
  }
  else if (el.tag === 'slot') {
    const a = genSlot(el, state)
    console.log('[shun] ---> genSlot:', a)
    return a
  }
  else {
    // component or element
    let code
    if (el.component) {
      code = genComponent(el.component, el, state)
    }
    else {
      let data
      const maybeComponent = state.maybeComponent(el)
      if (!el.plain || (el.pre && maybeComponent)) {
        data = genData(el, state)
      }

      let tag: string | undefined
      // check if this is a component in <script setup>
      const bindings = state.options.bindings
      if (maybeComponent && bindings && bindings.__isScriptSetup !== false) {
        tag = checkBindingType(bindings, el.tag)
      }
      if (!tag)
        tag = `'${el.tag}'`

      // 4. 如果 el.inlineTemplate 为 true，则 children 为 null，否则调用 genChildren 生成 children
      const children = el.inlineTemplate ? null : genChildren(el, state, true)
      code = `_c(${tag}${data ? `,${data}` : '' // data
        }${children ? `,${children}` : '' // children
        })`
    }
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code)
    }
    return code
  }
}

function checkBindingType(bindings: BindingMetadata, key: string) {
  const camelName = camelize(key)
  const PascalName = capitalize(camelName)
  const checkType = (type: BindingTypes) => {
    if (bindings[key] === type) {
      return key
    }
    if (bindings[camelName] === type) {
      return camelName
    }
    if (bindings[PascalName] === type) {
      return PascalName
    }
  }
  const fromConst
    = checkType(BindingTypes.SETUP_CONST)
    || checkType(BindingTypes.SETUP_REACTIVE_CONST)
  if (fromConst) {
    return fromConst
  }

  const fromMaybeRef
    = checkType(BindingTypes.SETUP_LET)
    || checkType(BindingTypes.SETUP_REF)
    || checkType(BindingTypes.SETUP_MAYBE_REF)
  if (fromMaybeRef) {
    return fromMaybeRef
  }
}

// 将静态子树提升到外部
function genStatic(el: ASTElement, state: CodegenState): string {
  // 将 el.staticProcessed 设置为 true，递归 genElement 时，不再进入 genStatic 函数
  el.staticProcessed = true
  const originalPreState = state.pre
  if (el.pre) {
    state.pre = el.pre
  }

  // 转换后的静态子树保存到 staticRenderFns 数组中
  state.staticRenderFns.push(`with(this){return ${genElement(el, state)}}`)
  state.pre = originalPreState
  // 返回 _m 函数，参数是静态子树在 staticRenderFns 数组中的索引下标
  return `_m(${state.staticRenderFns.length - 1}${el.staticInFor ? ',true' : ''
    })`
}

// v-once
function genOnce(el: ASTElement, state: CodegenState): string {
  el.onceProcessed = true
  if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  }
  else if (el.staticInFor) {
    let key = ''
    let parent = el.parent
    while (parent) {
      if (parent.for) {
        key = parent.key!
        break
      }
      parent = parent.parent
    }
    if (!key) {
      return genElement(el, state)
    }
    return `_o(${genElement(el, state)},${state.onceId++},${key})`
  }
  else {
    return genStatic(el, state)
  }
}

export function genIf(
  el: any, // 当前的 AST 元素
  state: CodegenState, // 状态
  altGen?: Function, // 备用生成函数
  altEmpty?: string, // 备用空字符串
): string {
  // 1. 将 el.ifProcessed 设置为 true，递归 genElement 时，不再进入 genIf 函数
  el.ifProcessed = true
  // 2. 生成 v-if 的代码
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
}

function genIfConditions(
  conditions: ASTIfConditions, // 条件数组
  state: CodegenState, // 状态
  altGen?: Function,
  altEmpty?: string,
): string {
  // 1. 如果条件数组为空，返回备用空字符串或者 _e()
  if (!conditions.length) {
    return altEmpty || '_e()'
  }

  const condition = conditions.shift()!
  // 2. 如果条件不为空，返回三元表达式
  if (condition.exp) {
    return `(${condition.exp})?${genTernaryExp(
      condition.block,
    )}:${genIfConditions(conditions, state, altGen, altEmpty)}`
  }
  else {
    // 3. 如果条件为空，直接返回 genTernaryExp(condition.block)
    return `${genTernaryExp(condition.block)}`
  }

  // 递归调用 genElement 生成节点代码
  function genTernaryExp(el: ASTElement) {
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        : genElement(el, state)
  }
}

export function genFor(
  el: any, // 当前的 AST 元素
  state: CodegenState,
  altGen?: Function,
  altHelper?: string,
): string {
  const exp = el.for
  const alias = el.alias
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''

  // 将 el.forProcessed 设置为 true，递归 genElement 时，不再进入 genFor 函数
  el.forProcessed = true

  return (
    `${altHelper || '_l'}((${exp}),`
    + `function(${alias}${iterator1}${iterator2}){`
    + `return ${(altGen || genElement)(el, state)}`
    + '})'
  )
}

export function genData(el: ASTElement, state: CodegenState): string {
  let data = '{'

  // directives first.
  // directives may mutate the el's other properties before they are generated.
  const dirs = genDirectives(el, state)
  if (dirs)
    data += `${dirs},`

  // key
  if (el.key) {
    data += `key:${el.key},`
  }
  // ref
  if (el.ref) {
    data += `ref:${el.ref},`
  }
  if (el.refInFor) {
    data += `refInFor:true,`
  }
  // pre
  if (el.pre) {
    data += `pre:true,`
  }
  // record original tag name for components using "is" attribute
  if (el.component) {
    data += `tag:"${el.tag}",`
  }
  // module data generation functions
  for (let i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el)
  }
  // attributes
  if (el.attrs) {
    data += `attrs:${genProps(el.attrs)},`
  }
  // DOM props
  if (el.props) {
    data += `domProps:${genProps(el.props)},`
  }
  // event handlers
  if (el.events) {
    data += `${genHandlers(el.events, false)},`
  }
  if (el.nativeEvents) {
    data += `${genHandlers(el.nativeEvents, true)},`
  }
  // slot target
  // only for non-scoped slots
  if (el.slotTarget && !el.slotScope) {
    data += `slot:${el.slotTarget},`
  }
  // scoped slots
  if (el.scopedSlots) {
    data += `${genScopedSlots(el, el.scopedSlots, state)},`
  }
  // component v-model
  if (el.model) {
    data += `model:{value:${el.model.value},callback:${el.model.callback},expression:${el.model.expression}},`
  }
  // inline-template
  if (el.inlineTemplate) {
    const inlineTemplate = genInlineTemplate(el, state)
    if (inlineTemplate) {
      data += `${inlineTemplate},`
    }
  }
  data = `${data.replace(/,$/, '')}}`
  // v-bind dynamic argument wrap
  // v-bind with dynamic arguments must be applied using the same v-bind object
  // merge helper so that class/style/mustUseProp attrs are handled correctly.
  if (el.dynamicAttrs) {
    data = `_b(${data},"${el.tag}",${genProps(el.dynamicAttrs)})`
  }
  // v-bind data wrap
  if (el.wrapData) {
    data = el.wrapData(data)
  }
  // v-on data wrap
  if (el.wrapListeners) {
    data = el.wrapListeners(data)
  }
  return data
}

function genDirectives(el: ASTElement, state: CodegenState): string | void {
  const dirs = el.directives
  if (!dirs)
    return
  let res = 'directives:['
  let hasRuntime = false
  let i, l, dir, needRuntime
  for (i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i]
    needRuntime = true
    const gen: DirectiveFunction = state.directives[dir.name]
    if (gen) {
      // compile-time directive that manipulates AST.
      // returns true if it also needs a runtime counterpart.
      needRuntime = !!gen(el, dir, state.warn)
    }
    if (needRuntime) {
      hasRuntime = true
      res += `{name:"${dir.name}",rawName:"${dir.rawName}"${dir.value
        ? `,value:(${dir.value}),expression:${JSON.stringify(dir.value)}`
        : ''
        }${dir.arg ? `,arg:${dir.isDynamicArg ? dir.arg : `"${dir.arg}"`}` : ''}${dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ''
        }},`
    }
  }
  if (hasRuntime) {
    return `${res.slice(0, -1)}]`
  }
}

function genInlineTemplate(
  el: ASTElement,
  state: CodegenState,
): string | undefined {
  const ast = el.children[0]
  if (ast && ast.type === 1) {
    const inlineRenderFns = generate(ast, state.options)
    return `inlineTemplate:{render:function(){${inlineRenderFns.render
      }},staticRenderFns:[${inlineRenderFns.staticRenderFns
        .map(code => `function(){${code}}`)
        .join(',')}]}`
  }
}

function genScopedSlots(
  el: ASTElement,
  slots: { [key: string]: ASTElement },
  state: CodegenState,
): string {
  // by default scoped slots are considered "stable", this allows child
  // components with only scoped slots to skip forced updates from parent.
  // but in some cases we have to bail-out of this optimization
  // for example if the slot contains dynamic names, has v-if or v-for on them...
  let needsForceUpdate
    = el.for
    || Object.keys(slots).some((key) => {
      const slot = slots[key]
      return (
        slot.slotTargetDynamic || slot.if || slot.for || containsSlotChild(slot) // is passing down slot from parent which may be dynamic
      )
    })

  // #9534: if a component with scoped slots is inside a conditional branch,
  // it's possible for the same component to be reused but with different
  // compiled slot content. To avoid that, we generate a unique key based on
  // the generated code of all the slot contents.
  let needsKey = !!el.if

  // OR when it is inside another scoped slot or v-for (the reactivity may be
  // disconnected due to the intermediate scope variable)
  // #9438, #9506
  // TODO: this can be further optimized by properly analyzing in-scope bindings
  // and skip force updating ones that do not actually use scope variables.
  if (!needsForceUpdate) {
    let parent = el.parent
    while (parent) {
      if (
        (parent.slotScope && parent.slotScope !== emptySlotScopeToken)
        || parent.for
      ) {
        needsForceUpdate = true
        break
      }
      if (parent.if) {
        needsKey = true
      }
      parent = parent.parent
    }
  }

  const generatedSlots = Object.keys(slots)
    .map(key => genScopedSlot(slots[key], state))
    .join(',')

  return `scopedSlots:_u([${generatedSlots}]${needsForceUpdate ? `,null,true` : ``
    }${!needsForceUpdate && needsKey ? `,null,false,${hash(generatedSlots)}` : ``
    })`
}

function hash(str: string): number {
  let hash = 5381
  let i = str.length
  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i)
  }
  return hash >>> 0
}

function containsSlotChild(el: ASTNode): boolean {
  if (el.type === 1) {
    if (el.tag === 'slot') {
      return true
    }
    return el.children.some(containsSlotChild)
  }
  return false
}

function genScopedSlot(el: ASTElement, state: CodegenState): string {
  const isLegacySyntax = el.attrsMap['slot-scope']
  if (el.if && !el.ifProcessed && !isLegacySyntax) {
    return genIf(el, state, genScopedSlot, `null`)
  }
  if (el.for && !el.forProcessed) {
    return genFor(el, state, genScopedSlot)
  }
  const slotScope
    = el.slotScope === emptySlotScopeToken ? `` : String(el.slotScope)
  const fn
    = `function(${slotScope}){`
    + `return ${el.tag === 'template'
      ? el.if && isLegacySyntax
        ? `(${el.if})?${genChildren(el, state) || 'undefined'}:undefined`
        : genChildren(el, state) || 'undefined'
      : genElement(el, state)
    }}`
  // reverse proxy v-slot without scope on this.$slots
  const reverseProxy = slotScope ? `` : `,proxy:true`
  return `{key:${el.slotTarget || `"default"`},fn:${fn}${reverseProxy}}`
}

// 生成子节点代码
export function genChildren(
  el: ASTElement,
  state: CodegenState,
  checkSkip?: boolean,
  altGenElement?: Function,
  altGenNode?: Function,
): string | void {
  const children = el.children
  // 如果 children 数组不为空，则生成子节点代码
  if (children.length) {
    const el: any = children[0]
    // 如果 children 数组中只有一个元素，并且该元素是 v-for 指令，则直接返回该元素的代码
    if (
      children.length === 1
      && el.for
      && el.tag !== 'template'
      && el.tag !== 'slot'
    ) {
      const normalizationType = checkSkip
        ? state.maybeComponent(el)
          ? `,1`
          : `,0`
        : ``
      return `${(altGenElement || genElement)(el, state)}${normalizationType}`
    }
    const normalizationType = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0
    const gen = altGenNode || genNode
    // 循环生成子节点代码
    return `[${children.map(c => gen(c, state)).join(',')}]${normalizationType ? `,${normalizationType}` : ''
      }`
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array)
// 2: full normalization needed
function getNormalizationType(
  children: Array<ASTNode>,
  maybeComponent: (el: ASTElement) => boolean,
): number {
  let res = 0
  for (let i = 0; i < children.length; i++) {
    const el: ASTNode = children[i]
    if (el.type !== 1) {
      continue
    }
    if (
      needsNormalization(el)
      || (el.ifConditions
      && el.ifConditions.some(c => needsNormalization(c.block)))
    ) {
      res = 2
      break
    }
    if (
      maybeComponent(el)
      || (el.ifConditions && el.ifConditions.some(c => maybeComponent(c.block)))
    ) {
      res = 1
    }
  }
  return res
}

function needsNormalization(el: ASTElement): boolean {
  return el.for !== undefined || el.tag === 'template' || el.tag === 'slot'
}

// 生成节点代码
function genNode(node: ASTNode, state: CodegenState): string {
  // 如果 node 是 ASTElement 元素节点，则调用 genElement 生成元素节点代码
  if (node.type === 1) {
    return genElement(node, state)
  }
  // 如果 node 是 ASTText 文本节点并且是注释节点，则调用 genComment 生成注释节点代码
  else if (node.type === 3 && node.isComment) {
    return genComment(node)
  }
  else {
    // 如果 node 是 ASTText 文本节点并且不是注释节点，则调用 genText 生成文本节点代码
    return genText(node)
  }
}

export function genText(text: ASTText | ASTExpression): string {
  return `_v(${text.type === 2
    // 如果 text 是 ASTExpression 表达式节点，则直接返回表达式
    ? text.expression // no need for () because already wrapped in _s()
    // 如果 text 是 ASTText 文本节点，则调用 transformSpecialNewlines 生成文本节点代码
    : transformSpecialNewlines(JSON.stringify(text.text))
    })`
}

export function genComment(comment: ASTText): string {
  return `_e(${JSON.stringify(comment.text)})`
}

function genSlot(el: ASTElement, state: CodegenState): string {
  const slotName = el.slotName || '"default"'
  const children = genChildren(el, state)
  let res = `_t(${slotName}${children ? `,function(){return ${children}}` : ''}`
  const attrs
    = el.attrs || el.dynamicAttrs
      ? genProps(
        (el.attrs || []).concat(el.dynamicAttrs || []).map(attr => ({
          // slot props are camelized
          name: camelize(attr.name),
          value: attr.value,
          dynamic: attr.dynamic,
        })),
      )
      : null
  const bind = el.attrsMap['v-bind']
  if ((attrs || bind) && !children) {
    res += `,null`
  }
  if (attrs) {
    res += `,${attrs}`
  }
  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`
  }
  return `${res})`
}

// componentName is el.component, take it as argument to shun flow's pessimistic refinement
function genComponent(
  componentName: string,
  el: ASTElement,
  state: CodegenState,
): string {
  const children = el.inlineTemplate ? null : genChildren(el, state, true)
  return `_c(${componentName},${genData(el, state)}${children ? `,${children}` : ''
    })`
}

function genProps(props: Array<ASTAttr>): string {
  let staticProps = ``
  let dynamicProps = ``
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    const value = transformSpecialNewlines(prop.value)
    if (prop.dynamic) {
      dynamicProps += `${prop.name},${value},`
    }
    else {
      staticProps += `"${prop.name}":${value},`
    }
  }
  staticProps = `{${staticProps.slice(0, -1)}}`
  if (dynamicProps) {
    return `_d(${staticProps},[${dynamicProps.slice(0, -1)}])`
  }
  else {
    return staticProps
  }
}

// #3895, #4268
function transformSpecialNewlines(text: string): string {
  return text.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}
