import { cached, isBuiltInTag, makeMap, no } from 'utils2'
import type { ASTElement, ASTNode, CompilerOptions } from 'types2'

let isStaticKey: any
let isPlatformReservedTag: any

const genStaticKeysCached = cached(genStaticKeys)

/**
 * 优化器的目标：遍历生成的模板 AST 树
 * 并检测出纯静态的子树，即 DOM 中从不需要更改的部分
 *
 * 一旦我们检测到这些子树，我们可以：
 *
 * 1. 将它们提升为常量，这样我们就不再需要在每次重新渲染时为它们创建新的节点
 * 2. 在 patch 过程中完全跳过它们
 */
export function optimize(
  root: ASTElement | null | undefined,
  options: CompilerOptions,
) {
  if (!root) {
    return
  }
  // 生成静态 key 的映射函数
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  // 生成平台保留标签的映射函数
  isPlatformReservedTag = options.isReservedTag || no
  // 第一次遍历：标记所有非静态节点
  markStatic(root)
  // 第二次遍历：标记静态根节点
  markStaticRoots(root, false)
}

function genStaticKeys(keys: string): Function {
  return makeMap(
    `type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap${keys ? `,${keys}` : ''}`,
  )
}

function markStatic(node: ASTNode) {
  node.static = isStatic(node)
  if (node.type === 1) {
    // 不要将组件插槽内容标记为静态，从而避免:
    // 1. 组件无法更改插槽节点
    // 2. 静态插槽内容在热重载时失败
    if (
      !isPlatformReservedTag(node.tag)
      && node.tag !== 'slot'
      && node.attrsMap['inline-template'] == null
    ) {
      // 对于自定义组件跳过静态标记
      return
    }

    // 递归标记子节点
    // 如果任一子节点不是静态的，则父节点（当前节点）也标记为非静态
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      if (!child.static) {
        node.static = false
      }
    }

    // 递归标记条件块中的所有节点
    // 如果任一子节点不是静态的，则父节点（当前节点）也标记为非静态
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

function markStaticRoots(node: ASTNode, isInFor: boolean) {
  // 剪枝：只处理元素类型节点，因为只有元素节点可以有子节点
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }

    // 如果节点没有子节点，或者仅有一个静态文本类型的子节点，比如 <div>hello</div>
    // 那么不应当标记为静态根节点，因为提取出来的成本将超过收益，反而不如直接渲染
    if (
      node.static
      && node.children.length
      && !(node.children.length === 1 && node.children[0].type === 3)
    ) {
      node.staticRoot = true
      return
    }
    else {
      node.staticRoot = false
    }

    // 递归标记子节点
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }

    // 递归标记条件块中的所有节点
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

function isStatic(node: ASTNode): boolean {
  if (node.type === 2) {
    // expression
    return false
  }
  if (node.type === 3) {
    // text
    return true
  }
  return !!(
    node.pre
    || (!node.hasBindings // no dynamic bindings
    && !node.if
    && !node.for // not v-if or v-for or v-else
    && !isBuiltInTag(node.tag) // not a built-in
    && isPlatformReservedTag(node.tag) // not a component
    && !isDirectChildOfTemplateFor(node)
    && Object.keys(node).every(isStaticKey))
  )
}

/**
 * 判断节点是否是模板 for 的直接子节点
 * 如果一个节点是 v-for 指令的直接子节点，
 * 它的内容可能是动态的，不能被错误地标记为静态节点
 */
function isDirectChildOfTemplateFor(node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
