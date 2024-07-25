import {
  canBeLeftOpenTag,
  // genStaticKeys,
  getTagNamespace,
  isPreTag,
  isReservedTag,
  isUnaryTag,
  // modules,
  // directives,
  mustUseProp,
} from 'utils2'

import type { CompilerOptions } from 'types2'

export const baseOptions: CompilerOptions = {
  expectHTML: true,
  // modules,
  // directives,
  isPreTag,
  isUnaryTag,
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag,
  getTagNamespace,
  // staticKeys: genStaticKeys(modules),
}
