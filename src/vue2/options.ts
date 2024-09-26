import {
  canBeLeftOpenTag,
  genStaticKeys,
  getTagNamespace,
  isPreTag,
  isReservedTag,
  isUnaryTag,
  // directives,
  mustUseProp,
} from 'utils2'
import type { CompilerOptions } from 'types2'
import modules from './modules'

export const baseOptions: CompilerOptions = {
  expectHTML: true,
  modules,
  // directives,
  isPreTag,
  isUnaryTag,
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag,
  getTagNamespace,
  staticKeys: genStaticKeys(modules),
}
