import js from '@eslint/js'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default defineConfigWithVueTs(
  { ignores: ['dist/', 'demo/dist/', 'coverage/'] },
  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // Test probes are short-named and declare props as plain name lists.
    files: ['tests/**'],
    rules: { 'vue/require-prop-types': 'off', 'vue/multi-word-component-names': 'off' },
  },
)
