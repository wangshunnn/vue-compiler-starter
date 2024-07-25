export interface CompilerOptions {
  warn?: Function // allow customizing warning in different environments; e.g. node
  modules?: Array<ModuleOptions> // platform specific modules; e.g. style; class
  directives?: { [key: string]: Function } // platform specific directives
  staticKeys?: string // a list of AST properties to be considered static; for optimization
  isUnaryTag?: (tag: string) => boolean | undefined // check if a tag is unary for the platform
  canBeLeftOpenTag?: (tag: string) => boolean | undefined // check if a tag can be left opened
  isReservedTag?: (tag: string) => boolean | undefined // check if a tag is a native for the platform
  preserveWhitespace?: boolean // preserve whitespace between elements? (Deprecated)
  whitespace?: 'preserve' | 'condense' // whitespace handling strategy
  optimize?: boolean // optimize static content?

  // web specific
  mustUseProp?: (tag: string, type: string | null, name: string) => boolean // check if an attribute should be bound as a property
  isPreTag?: (attr: string) => boolean | null // check if a tag needs to preserve whitespace
  getTagNamespace?: (tag: string) => string | undefined // check the namespace for a tag
  expectHTML?: boolean // only false for non-web builds
  isFromDOM?: boolean
  shouldDecodeTags?: boolean
  shouldDecodeNewlines?: boolean
  shouldDecodeNewlinesForHref?: boolean
  outputSourceRange?: boolean
  shouldKeepComment?: boolean

  // runtime user-configurable
  delimiters?: [string, string] // template delimiters
  comments?: boolean // preserve comments in template

  // for ssr optimization compiler
  scopeId?: string

  // SFC analyzed script bindings from `compileScript()`
  bindings?: BindingMetadata
}

export interface CompiledResult {
  ast: ASTElement | null
  render: string
  staticRenderFns: Array<string>
  stringRenderFns?: Array<string>
  errors?: Array<string | WarningMessage>
  tips?: Array<string | WarningMessage>
}

export interface WarningMessage {
  msg: string
  start?: number
  end?: number
}

export interface ModuleOptions {
  // transform an AST node before any attributes are processed
  // returning an ASTElement from pre/transforms replaces the element
  preTransformNode?: (el: ASTElement) => ASTElement | null | void
  // transform an AST node after built-ins like v-if, v-for are processed
  transformNode?: (el: ASTElement) => ASTElement | null | void
  // transform an AST node after its children have been processed
  // cannot return replacement in postTransform because tree is already finalized
  postTransformNode?: (el: ASTElement) => void
  genData?: (el: ASTElement) => string // generate extra data string for an element
  transformCode?: (el: ASTElement, code: string) => string // further transform generated code for an element
  staticKeys?: Array<string> // AST properties to be considered static
}

export type BindingMetadata = {
  [key: string]: BindingTypes | undefined
} & {
  __isScriptSetup?: boolean
}

export enum BindingTypes {
  /**
   * returned from data()
   */
  DATA = 'data',
  /**
   * declared as a prop
   */
  PROPS = 'props',
  /**
   * a local alias of a `<script setup>` destructured prop.
   * the original is stored in __propsAliases of the bindingMetadata object.
   */
  PROPS_ALIASED = 'props-aliased',
  /**
   * a let binding (may or may not be a ref)
   */
  SETUP_LET = 'setup-let',
  /**
   * a const binding that can never be a ref.
   * these bindings don't need `unref()` calls when processed in inlined
   * template expressions.
   */
  SETUP_CONST = 'setup-const',
  /**
   * a const binding that does not need `unref()`, but may be mutated.
   */
  SETUP_REACTIVE_CONST = 'setup-reactive-const',
  /**
   * a const binding that may be a ref.
   */
  SETUP_MAYBE_REF = 'setup-maybe-ref',
  /**
   * bindings that are guaranteed to be refs
   */
  SETUP_REF = 'setup-ref',
  /**
   * declared by other options, e.g. computed, inject
   */
  OPTIONS = 'options',
}

export type ASTNode = ASTElement | ASTText | ASTExpression

export interface ASTAttr {
  name: string
  value: any
  dynamic?: boolean
  start?: number
  end?: number
}

export interface ASTText {
  type: 3
  text: string
  static?: boolean
  isComment?: boolean
  // 2.4 ssr optimization
  ssrOptimizability?: number
  start?: number
  end?: number
}

export interface ASTElement {
  type: 1
  tag: string
  attrsList: Array<ASTAttr>
  attrsMap: { [key: string]: any }
  rawAttrsMap: { [key: string]: ASTAttr }
  parent: ASTElement | void
  children: Array<ASTNode>

  start?: number
  end?: number

  processed?: true

  static?: boolean
  staticRoot?: boolean
  staticInFor?: boolean
  staticProcessed?: boolean
  hasBindings?: boolean

  text?: string
  attrs?: Array<ASTAttr>
  dynamicAttrs?: Array<ASTAttr>
  props?: Array<ASTAttr>
  plain?: boolean
  pre?: true
  ns?: string

  component?: string
  inlineTemplate?: true
  transitionMode?: string | null
  slotName?: string | null
  slotTarget?: string | null
  slotTargetDynamic?: boolean
  slotScope?: string | null
  scopedSlots?: { [name: string]: ASTElement }

  ref?: string
  refInFor?: boolean

  if?: string
  ifProcessed?: boolean
  elseif?: string
  else?: true
  ifConditions?: ASTIfConditions

  for?: string
  forProcessed?: boolean
  key?: string
  alias?: string
  iterator1?: string
  iterator2?: string

  staticClass?: string
  classBinding?: string
  staticStyle?: string
  styleBinding?: string
  events?: ASTElementHandlers
  nativeEvents?: ASTElementHandlers

  transition?: string | true
  transitionOnAppear?: boolean

  model?: {
    value: string
    callback: string
    expression: string
  }

  directives?: Array<ASTDirective>

  forbidden?: true
  once?: true
  onceProcessed?: boolean
  wrapData?: (code: string) => string
  wrapListeners?: (code: string) => string

  // 2.4 ssr optimization
  ssrOptimizability?: number
}

export interface ASTExpression {
  type: 2
  expression: string
  text: string
  tokens: Array<string | object>
  static?: boolean
  // 2.4 ssr optimization
  ssrOptimizability?: number
  start?: number
  end?: number
}

export interface ASTModifiers { [key: string]: boolean }
export type ASTIfConditions = Array<ASTIfCondition>
export interface ASTIfCondition { exp: string | undefined, block: ASTElement }

export interface ASTDirective {
  name: string
  rawName: string
  value: string
  arg: string | null
  isDynamicArg: boolean
  modifiers: ASTModifiers | null
  start?: number
  end?: number
}

export interface ASTElementHandlers {
  [key: string]: ASTElementHandler | Array<ASTElementHandler>
}

export interface ASTElementHandler {
  value: string
  params?: Array<any>
  modifiers: ASTModifiers | null
  dynamic?: boolean
  start?: number
  end?: number
}
declare const RefSymbol: unique symbol
export declare const RawSymbol: unique symbol

/**
 * @internal
 */
export const RefFlag = `__v_isRef`

export interface Ref<T = any> {
  value: T
  /**
   * Type differentiator only.
   * We need this to be in public d.ts but don't want it to show up in IDE
   * autocomplete, so we use a private Symbol instead.
   */
  [RefSymbol]: true
  /**
   * @internal
   */
  dep?: any
  /**
   * @internal
   */
  [RefFlag]: true
}
/**
 * @internal
 */
export interface VNodeData {
  key?: string | number
  slot?: string
  ref?: string | Ref | ((el: any) => void)
  is?: string
  pre?: boolean
  tag?: string
  staticClass?: string
  class?: any
  staticStyle?: { [key: string]: any }
  style?: string | Array<object> | object
  normalizedStyle?: object
  props?: { [key: string]: any }
  attrs?: { [key: string]: string }
  domProps?: { [key: string]: any }
  hook?: { [key: string]: Function }
  on?: { [key: string]: Function | Array<Function> }
  nativeOn?: { [key: string]: Function | Array<Function> }
  transition?: object
  show?: boolean // marker for v-show
  inlineTemplate?: {
    render: Function
    staticRenderFns: Array<Function>
  }
  directives?: Array<VNodeDirective>
  keepAlive?: boolean
  scopedSlots?: { [key: string]: Function }
  model?: {
    value: any
    callback: Function
  }

  [key: string]: any
}

/**
 * @internal
 */
export interface VNodeDirective {
  name: string
  rawName: string
  value?: any
  oldValue?: any
  arg?: string
  oldArg?: string
  modifiers?: ASTModifiers
  def?: object
}

type Component = any

/**
 * @internal
 */
// interface for vnodes in update modules
export type VNodeWithData = VNode & {
  tag: string
  data: VNodeData
  children: Array<VNode>
  text: void
  elm: any
  ns: string | void
  context: Component
  key: string | number | undefined
  parent?: VNodeWithData
  componentOptions?: VNodeComponentOptions
  componentInstance?: Component
  isRootInsert: boolean
}

/**
 * @internal
 */
export class VNode {
  tag?: string
  data: VNodeData | undefined
  children?: Array<VNode> | null
  text?: string
  elm: Node | undefined
  ns?: string
  context?: Component // rendered in this component's scope
  key: string | number | undefined
  componentOptions?: VNodeComponentOptions
  componentInstance?: Component // component instance
  parent: VNode | undefined | null // component placeholder node

  // strictly internal
  raw: boolean // contains raw HTML? (server only)
  isStatic: boolean // hoisted static node
  isRootInsert: boolean // necessary for enter transition check
  isComment: boolean // empty comment placeholder?
  isCloned: boolean // is a cloned node?
  isOnce: boolean // is a v-once node?
  asyncFactory?: Function // async component factory function
  asyncMeta: object | void
  isAsyncPlaceholder: boolean
  ssrContext?: object | void
  fnContext: Component | void // real context vm for functional nodes
  fnOptions?: ComponentOptions | null // for SSR caching
  devtoolsMeta?: object | null // used to store functional render context for devtools
  fnScopeId?: string | null // functional scope id support
  isComponentRootElement?: boolean | null // for SSR directives

  constructor(
    tag?: string,
    data?: VNodeData,
    children?: Array<VNode> | null,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function,
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child(): Component | void {
    return this.componentInstance
  }
}

/**
 * @internal
 */
export interface VNodeComponentOptions {
  Ctor: any
  propsData?: object
  listeners?: Record<string, Function | Function[]>
  children?: Array<VNode>
  tag?: string
}

type InjectKey = string | symbol

/**
 * @internal
 */
export interface SetupContext {
  attrs: Record<string, any>
  listeners: Record<string, Function | Function[]>
  slots: Record<string, () => VNode[]>
  emit: (event: string, ...args: any[]) => any
  expose: (exposed: Record<string, any>) => void
}

export interface PropOptions {
  type?: Function | Array<Function> | null
  default?: any
  required?: boolean | null
  validator?: Function | null
}

/**
 * @internal
 */
export interface ComponentOptions {
  // v3
  setup?: (props: Record<string, any>, ctx: SetupContext) => unknown

  [key: string]: any

  componentId?: string

  // data
  data: object | Function | void
  props?:
    | string[]
    | Record<string, Function | Array<Function> | null | PropOptions>
  propsData?: object
  computed?: {
    [key: string]:
      | Function
      | {
        get?: Function
        set?: Function
        cache?: boolean
      }
  }
  methods?: { [key: string]: Function }
  watch?: { [key: string]: Function | string }

  // DOM
  el?: string | Element
  template?: string
  render: (h: () => VNode) => VNode
  renderError?: (h: () => VNode, err: Error) => VNode
  staticRenderFns?: Array<() => VNode>

  // lifecycle
  beforeCreate?: Function
  created?: Function
  beforeMount?: Function
  mounted?: Function
  beforeUpdate?: Function
  updated?: Function
  activated?: Function
  deactivated?: Function
  beforeDestroy?: Function
  destroyed?: Function
  errorCaptured?: () => boolean | void
  serverPrefetch?: Function
  renderTracked?: (e: DebuggerEvent) => void
  renderTriggerd?: (e: DebuggerEvent) => void

  // assets
  directives?: { [key: string]: object }
  components?: { [key: string]: Component }
  transitions?: { [key: string]: object }
  filters?: { [key: string]: Function }

  // context
  provide?: Record<string | symbol, any> | (() => Record<string | symbol, any>)
  inject?:
    | { [key: string]: InjectKey | { from?: InjectKey, default?: any } }
    | Array<string>

  // component v-model customization
  model?: {
    prop?: string
    event?: string
  }

  // misc
  parent?: Component
  mixins?: Array<object>
  name?: string
  extends?: Component | object
  delimiters?: [string, string]
  comments?: boolean
  inheritAttrs?: boolean

  // Legacy API
  abstract?: any

  // private
  _isComponent?: true
  _propKeys?: Array<string>
  _parentVnode?: VNode
  _parentListeners?: object | null
  _renderChildren?: Array<VNode> | null
  _componentTag: string | null
  _scopeId: string | null
  _base: any
}

export type DebuggerEvent = {
  /**
   * @internal
   */
  effect: any
} & DebuggerEventExtraInfo

export interface DebuggerEventExtraInfo {
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key?: any
  newValue?: any
  oldValue?: any
}

export const enum TrackOpTypes {
  GET = 'get',
  TOUCH = 'touch',
}

export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  ARRAY_MUTATION = 'array mutation',
}
