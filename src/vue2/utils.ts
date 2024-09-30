/* eslint-disable prefer-const */
/* eslint-disable import/no-mutable-exports */

import type { VNode, VNodeData, VNodeWithData } from 'types2'

// Browser environment sniffing
export const inBrowser = typeof window !== 'undefined'
export const UA = inBrowser && window.navigator.userAgent.toLowerCase()
export const isIE = UA && /msie|trident/.test(UA)
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0
export const isEdge = UA && UA.indexOf('edge/') > 0
export const isAndroid = UA && UA.indexOf('android') > 0
export const isIOS = UA && /iphone|ipad|ipod|ios/.test(UA)
export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge
export const isPhantomJS = UA && /phantomjs/.test(UA)
export const isFF = UA && UA.match(/firefox\/(\d+)/)

// this needs to be lazy-evaled because vue may be required before
// vue-server-renderer can set VUE_ENV
let _isServer: boolean | undefined
export function isServerRendering() {
  if (_isServer === undefined) {
    /* istanbul ignore if */
    if (!inBrowser && typeof globalThis !== 'undefined') {
      // detect presence of vue-server-renderer and avoid
      // Webpack shimming the process
      _isServer
        // eslint-disable-next-line node/prefer-global/process
        = globalThis.process && globalThis.process.env.VUE_ENV === 'server'
    }
    else {
      _isServer = false
    }
  }
  return _isServer
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
export function makeMap(
  str: string,
  expectsLowerCase?: boolean,
): (key: string) => true | undefined {
  const map = Object.create(null)
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase ? val => map[val.toLowerCase()] : val => map[val]
}

/**
 * Always return false.
 */
export const no = (_a?: any, _b?: any, _c?: any) => false

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */
export function noop(_a?: any, _b?: any, _c?: any) { }

export let tip = noop

// HTML5 tags https://html.spec.whatwg.org/multipage/indices.html#elements-3
// Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
export const isNonPhrasingTag = makeMap(
  'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,'
  + 'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,'
  + 'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,'
  + 'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,'
  + 'title,tr,track',
)

/**
 * unicode letters used for parsing html tags, component names and property paths.
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 */
export const unicodeRegExp
  = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/

export const warn: (msg: string, vm?: any | null) => void = noop

/**
 * Camelize a hyphen-delimited string.
 */
const camelizeRE = /-(\w)/g
export const camelize = cached((str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})

/**
 * Mix properties into target object.
 */
export function extend(
  to: Record<PropertyKey, any>,
  _from?: Record<PropertyKey, any>,
): Record<PropertyKey, any> {
  for (const key in _from) {
    to[key] = _from[key]
  }
  return to
}

/**
 * Hyphenate a camelCase string.
 */
const hyphenateRE = /\B([A-Z])/g
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

/**
 * Create a cached version of a pure function.
 */
export function cached<R>(fn: (str: string) => R): (sr: string) => R {
  const cache: Record<string, R> = Object.create(null)
  return function cachedFn(str: string) {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }
}

export const emptyObject: Record<string, any> = Object.freeze({})

/**
 * Query an element selector if it's not an element already.
 */
export function query(el: string | Element): Element {
  if (typeof el === 'string') {
    const selected = document.querySelector(el)
    if (!selected) {
      return document.createElement('div')
    }
    return selected
  }
  else {
    return el
  }
}

// these are reserved for web because they are directly compiled away
// during template compilation
export const isReservedAttr = makeMap('style,class')

// attributes that should be using props for binding
const acceptValue = makeMap('input,textarea,option,select,progress')
export function mustUseProp(tag: string, type?: string | null, attr?: string): boolean {
  return (
    (attr === 'value' && acceptValue(tag) && type !== 'button')
    || (attr === 'selected' && tag === 'option')
    || (attr === 'checked' && tag === 'input')
    || (attr === 'muted' && tag === 'video')
  )
}

export const isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck')

const isValidContentEditableValue = makeMap(
  'events,caret,typing,plaintext-only',
)

export function convertEnumeratedValue(key: string, value: any) {
  return isFalsyAttrValue(value) || value === 'false'
    ? 'false'
    : key === 'contenteditable' && isValidContentEditableValue(value) // allow arbitrary string value for contenteditable
      ? value
      : 'true'
}

export const isBooleanAttr = makeMap(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,'
  + 'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,'
  + 'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,'
  + 'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,'
  + 'required,reversed,scoped,seamless,selected,sortable,'
  + 'truespeed,typemustmatch,visible',
)

export const xlinkNS = 'http://www.w3.org/1999/xlink'

export function isXlink(name: string): boolean {
  return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
}

export function getXlinkProp(name: string): string {
  return isXlink(name) ? name.slice(6, name.length) : ''
}

export function isFalsyAttrValue(val: any): boolean {
  return val == null || val === false
}

export function isDef<T>(v: T): v is NonNullable<T> {
  return v !== undefined && v !== null
}

/**
 * Quick object check - this is primarily used to tell
 * objects from primitive values when we know the value
 * is a JSON-compliant type.
 */
export function isObject(obj: any): boolean {
  return obj !== null && typeof obj === 'object'
}

export function genClassForVnode(vnode: VNodeWithData): string {
  let data = vnode.data
  let parentNode: VNode | VNodeWithData | undefined = vnode
  let childNode: VNode | VNodeWithData = vnode
  while (isDef(childNode.componentInstance)) {
    childNode = childNode.componentInstance._vnode!
    if (childNode && childNode.data) {
      data = mergeClassData(childNode.data, data)
    }
  }
  // @ts-expect-error parentNode.parent not VNodeWithData
  while (isDef((parentNode = parentNode.parent))) {
    if (parentNode && parentNode.data) {
      data = mergeClassData(data, parentNode.data)
    }
  }
  return renderClass(data.staticClass!, data.class)
}

function mergeClassData(
  child: VNodeData,
  parent: VNodeData,
): {
    staticClass: string
    class: any
  } {
  return {
    staticClass: concat(child.staticClass, parent.staticClass),
    class: isDef(child.class) ? [child.class, parent.class] : parent.class,
  }
}

export function renderClass(
  staticClass: string | null | undefined,
  dynamicClass: any,
): string {
  if (isDef(staticClass) || isDef(dynamicClass)) {
    return concat(staticClass, stringifyClass(dynamicClass))
  }
  /* istanbul ignore next */
  return ''
}

export function concat(a?: string | null, b?: string | null): string {
  return a ? (b ? `${a} ${b}` : a) : b || ''
}

export function stringifyClass(value: any): string {
  if (Array.isArray(value)) {
    return stringifyArray(value)
  }
  if (isObject(value)) {
    return stringifyObject(value)
  }
  if (typeof value === 'string') {
    return value
  }
  /* istanbul ignore next */
  return ''
}

function stringifyArray(value: Array<any>): string {
  let res = ''
  let stringified
  for (let i = 0, l = value.length; i < l; i++) {
    if (isDef((stringified = stringifyClass(value[i]))) && stringified !== '') {
      if (res)
        res += ' '
      res += stringified
    }
  }
  return res
}

function stringifyObject(value: Record<string, unknown>): string {
  let res = ''
  for (const key in value) {
    if (value[key]) {
      if (res)
        res += ' '
      res += key
    }
  }
  return res
}

export const isPreTag = (tag?: string): boolean => tag === 'pre'

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
export const isSVG = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,'
  + 'foreignobject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,'
  + 'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true,
)

export function getTagNamespace(tag: string): string | undefined {
  if (isSVG(tag)) {
    return 'svg'
  }
  // basic support for MathML
  // note it doesn't support other MathML elements being component roots
  if (tag === 'math') {
    return 'math'
  }
}

export const isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,'
  + 'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,'
  + 'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,'
  + 'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,'
  + 's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,'
  + 'embed,object,param,source,canvas,script,noscript,del,ins,'
  + 'caption,col,colgroup,table,thead,tbody,td,th,tr,'
  + 'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,'
  + 'output,progress,select,textarea,'
  + 'details,dialog,menu,menuitem,summary,'
  + 'content,element,shadow,template,blockquote,iframe,tfoot',
)

export function isReservedTag(tag: string): boolean | undefined {
  return isHTMLTag(tag) || isSVG(tag)
}

/**
 * Generate a string containing static keys from compiler modules.
 */
export function genStaticKeys(
  modules: Array<{ staticKeys?: string[] } /* ModuleOptions */>,
): string {
  return modules
    .reduce<string[]>((keys, m) => keys.concat(m.staticKeys || []), [])
    .join(',')
}

// Elements that you can, intentionally, leave open
// (and which close themselves)
export const canBeLeftOpenTag = makeMap(
  'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source',
)

export const isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,'
  + 'link,meta,param,source,track,wbr',
)

export const isBuiltInTag = makeMap('slot,component', true)

/**
 * Capitalize a string.
 */
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})
