// @ts-check
import config from '@antfu/eslint-config'

export default config(
  {
    typescript: {
      overrides: {
        'no-cond-assign': 'off',
        'no-new': 'off',
        'unicorn/no-new-array': 'off',
        'no-new-func': 'off',
        'no-restricted-syntax': 'off',
        'prefer-arrow-callback': 'off',
        'ts/prefer-ts-expect-error': 'off',
        'ts/no-unsafe-function-type': 'off',
      },
    },
  },
)
