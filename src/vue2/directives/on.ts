import type { ASTDirective, ASTElement } from 'types2'

export default function on(el: ASTElement, dir: ASTDirective) {
  el.wrapListeners = (code: string) => `_g(${code},${dir.value})`
}
