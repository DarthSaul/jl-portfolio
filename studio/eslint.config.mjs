import studio from '@sanity/eslint-config-studio'

export default [
  ...studio,
  {
    // promote.mjs is a Node CLI, not Studio code. The shared config assumes a browser, so
    // without this every `console` and `process` in it reads as an undefined global.
    files: ['promote.mjs'],
    languageOptions: {
      globals: {URL: 'readonly', console: 'readonly', fetch: 'readonly', process: 'readonly'},
    },
  },
]
