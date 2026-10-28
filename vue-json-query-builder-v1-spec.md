# vue-json-query-builder v1 spec

Plan for rewriting vue-json-query-builder as v1: Vue 3, TypeScript, Tailwind v4. Publish `1.0.0-beta.N` to npm first and `1.0.0` once a host app has integrated it.

## Decisions

| # | Decision |
|---|---|
| D1 | v1 is a breaking major release, published unscoped to the public npm registry. |
| D2 | Toolchain: Vite library mode (ESM only), TypeScript, `<script setup>`, `vue-tsc` declarations, Vitest + `@vue/test-utils` + `vitest-axe`, ESLint flat config. `vue` `^3.4` is a peer dependency. Vue CLI, Babel, node-sass, mocha/chai, nyc, styleguidist, BootstrapVue and committed `dist/` / `demo/` are removed. A Vite demo app deploys to GitHub Pages. A GitHub Actions workflow publishes on `v*` tags with an `NPM_AUTH_TOKEN` secret. |
| D3 | Tree format: a group is `{ "condition": "and" \| "or", "rules": [rule \| group] }`; a rule is `{ "field": string, "operator": string, "value": unknown }`. Operators: `eq`, `neq`, `contains`, `not_contains`, `starts_with`, `ends_with`, `not_starts_with`, `not_ends_with`, `gt`, `lt`, `gte`, `lte`, `between`, `in`, `not_in`, `any_of`, `all_of`, `none_of`. `between` takes `[min, max]`; `in`/`not_in`/`any_of`/`all_of`/`none_of` take a non-empty array. `migrateV0Query()` converts 0.1.x trees (`id` → `field`, symbol operators → names). |
| D4 | Field definitions: `{ field, label, type, operators?, options?, multiValued?, inputType?, component?, placeholder? }`. Types are `text`, `number`, `date`, `time`, `select`. `operators` overrides the type's defaults; the first entry is the default for a new rule. `select` takes `options: { value, label }[]`. `multiValued: true` on a select switches its default operators to `any_of`/`all_of`/`none_of`. `component` overrides the value control for that field only. |
| D5 | State: `v-model` (`modelValue`) is the single source of truth and fully controlled; the parent may replace the tree at any time (for example from the URL on back/forward). Updates are immutable, with events bubbling up (no `$parent`, no prop mutation). `defaultQuery` is what Reset restores. `v-model:valid` reports whether every rule is complete and valid. Exported helpers: `isQueryValid(tree, fields)`, `isRuleComplete(rule, field)`, `pruneIncomplete(tree, fields)`. |
| D6 | Row keys come from an internal `WeakMap<node, id>`; the immutable-update helper carries the old node's id to its replacement, so keys change only when the parent swaps in an unrelated tree. No `uuid` dependency, no `_uuid` property in the emitted JSON. |
| D7 | Styling is both token-driven and injectable. The builder's own chrome uses Tailwind utilities on semantic tokens (`bg-primary`, `hover:bg-primary-hover`, `text-danger`, `border-neutral-border`, ...). The library ships `theme.css` with `@theme default` fallbacks for standalone use. An app that defines those tokens itself skips `theme.css` and adds `@source "../node_modules/vue-json-query-builder/dist"`. Controls are swappable through a `components` prop (`button`, `select`, `input`, `multiSelect`, `date`, `time`, `number`, `modal`) with a documented props/emit contract. Defaults are token-styled native controls plus a token-styled multi-select listbox. |
| D8 | Value-control contract: props `modelValue`, `field`, `operator`, `options`, `multiple`, `id`, `ariaLabel`, `ariaDescribedby`, `ariaInvalid`, `disabled`; emits `update:modelValue`. `between` renders two controls (Min/Max or From/To). When an app's component has a different API, the app writes a small adapter. |
| D9 | Chrome is opt-in. The core is the group/rule tree only. Header, footer and Run/Reset render through slots with defaults that show only when their props are given (`title`/`collapsible`, `runQuery`, `defaultQuery` + `showReset`). Persistence is a `storage` adapter `{ load, save, list, remove }` with an exported `localStorageAdapter`; with no adapter, no save/load UI renders. |
| D10 | The 13 bug fixes from 0.1.41, each with a regression test: (1) restored queries had no row keys; (2) prop mutation and `$parent` deletes; (3) unused `value` prop, emit-only `v-model`; (4) `month` type with no input; (5) saved queries written under `VueJSONQueryBuilder_saved_` with empty `storage`; (6) deleting a saved query deleted the last one (`indexOf` on the wrong objects); (7) a rule whose field isn't in `fields` threw (render an invalid, removable "Unknown field" state); (8) a rejected `runQuery` left `loading` true forever, and `pointer-events: none` still let keyboard through (use `finally` and `inert`/`disabled`); (9) adding a rule with empty `fields` crashed; (10) `number` emitted strings (emit numbers); (11) global unscoped `.modal * { font-size: 12px !important }` leaked into host modals; (12) multi-value detection via `operator.includes('in')` (use an explicit set); (13) an emptied group stayed empty and valid (an empty group is invalid; the last rule's delete removes a nested group or leaves one blank rule at the root). |
| D11 | Accessibility, WCAG 2.2 AA. Each rule is `role="group"` labeled "Rule N", with visually hidden labels on field, operator and value controls and `aria-label="Remove rule N"` on delete. Each group is `role="group"` labeled "Group: match all/any of the following"; the AND/OR toggle is a `radiogroup` labeled All/Any. Adding a rule or group focuses its first control; removing one focuses the previous sibling, else the parent's "Add rule" button. Inline errors use `aria-describedby`/`aria-invalid` and a polite live region. Injected components receive the label and `aria-*` through D8. |

<!-- TRANSCRIPTION NOTE: transcribed from photos. The photos jump from D11 straight to
"Requirements from the first host app"; if the original has decisions after D11, they are missing here. -->

## Requirements from the first host app

- The host is a Vue 3 + Vite + Tailwind v4 app with CSS-first `@theme` tokens. It defines `--color-primary` (+ `-hover`, `-active`, `-focus`), `--color-danger` (+ `-hover`, `-active`), `--color-neutral-border`, `--color-neutral-light`, `--color-neutral-dark`, `--color-neutral-white`, `--color-neutral-very-light` and `--color-light`. Use only these token names in templates so the host's theme applies with no extra CSS.
- It will inject its own button, single-value select (options shaped `{ value, text }`), text input, modal, date picker (`value` prop / `input` event) and a comma-formatted currency input, mostly through adapters. It has no multi-select, so the library's default multi-select has to be production quality: keyboard operable, typeahead, selected count.
- Field shapes it needs: text; select with `in`/`not_in`; multiValued select with `any_of`/`all_of`/`none_of`; number with `between`/`gte`/`lte`/`eq`; date with `between`/`gte`/`lte`.
- It keeps the tree in the URL, replaces `modelValue` on navigation, and acts only on `pruneIncomplete(tree)`, so a half-filled rule must never be treated as an error, and a reversed `between` must show an inline error.
- It passes no `title`, `runQuery` or `storage`, so the bare builder must look complete without any chrome.

## Milestones

### Milestone 1: toolchain

- [x] Remove Vue CLI, Babel, node-sass, mocha/chai, nyc, styleguidist, BootstrapVue/Bootstrap, `uuid`, `core-js`, `babel.config.js`, `vue.config.js`, `styleguide.config.js`, `_config.yml`, `src/scss/`, `tests/coverage/`, and committed `dist/`, `demo/`, `docs/`. Add them to `.gitignore` where generated.
- [x] Vite library mode: entry `src/index.ts`, ESM output, `vue` external. `package.json` `exports` for `.` (JS + types) and `./theme.css`; `files: ["dist"]`; `peerDependencies: { "vue": "^3.4" }`; `sideEffects: ["*.css"]`; version `1.0.0-beta.0`.
- [x] TypeScript strict, `vue-tsc --declaration --emitDeclarationOnly`.
- [x] Tailwind v4 via `@tailwindcss/vite` for the demo and for building `theme.css`. Components carry plain utility classes in their templates; the package ships no compiled utility CSS (consumers `@source` it, D7).
- [x] Vitest + `@vue/test-utils` + `jsdom` + `vitest-axe`. ESLint flat config (`eslint-plugin-vue`, `typescript-eslint`).
- [x] GitHub Actions: `ci.yml` (Node 24: install, lint, typecheck, test, build) on push and PR to `master`; `publish.yml` on `v*` tags (`npm publish --provenance --access public`, `--tag beta` when the version has a prerelease) with `NPM_AUTH_TOKEN`; `pages.yml` building the demo to GitHub Pages on `master`. Replace the old `build.yml`.

### Milestone 2: model and helpers (`src/model/`)

- [x] Types: `QueryGroup`, `QueryRule`, `QueryNode`, `Condition`, `Operator`, `FieldType`, `FieldDef`, `SelectOption`, `ComponentMap`, `ValueControlProps`, `StorageAdapter`, `SavedQuery`.
- [x] `DEFAULT_OPERATORS` per type: text `eq, neq, contains, not_contains, starts_with, ends_with, not_starts_with, not_ends_with`; number/date/time `eq, neq, gt, lt, gte, lte, between`; select `eq, neq, in, not_in`; multiValued select `any_of, all_of, none_of`. `DEFAULT_OPERATOR_LABELS` (`is`, `is not`, `contains`, `is between`, `is any of`, `has any of`, `has all of`, `has none of`, ...), overridable through an `operatorLabels` prop.
- [x] `MULTI_VALUE_OPERATORS = new Set(['in', 'not_in', 'any_of', 'all_of', 'none_of'])` (fix 12).
- [x] Immutable update helpers: `updateNode`, `insertNode`, `removeNode`, `replaceNode` by path. `nodeIds` `WeakMap` with an `idFor(node)` that assigns on first sight; every helper copies the old node's id to its replacement (D6, fix 1).
- [x] `isRuleComplete(rule, field)`: value present for the operator's arity; `between` both ends present; arrays non-empty; numbers finite. `isRuleValid`: complete and `between` ordered. `isQueryValid(tree, fields)`: every rule valid, every field known, no empty group (fix 13). `pruneIncomplete(tree, fields)`: drops incomplete or invalid rules and then-empty groups; returns `null` when nothing is left.
- [x] Operator change resets the value only when arity changes (single ↔ array ↔ pair). Field change resets the operator to the field's first and the value to empty.
- [x] `migrateV0Query(v0)`: `id` → `field`; `=` → `eq`, `!=` → `neq`, `()` → `contains`, `!()` → `not_contains`, `(` → `starts_with`, `)` → `ends_with`, `!(` → `not_starts_with`, `!)` → `not_ends_with`, `>`/`<`/`>=`/`<=` → `gt`/`lt`/`gte`/`lte`, `in`/`not in` → `in`/`not_in`. Unknown operators throw.
- [x] `localStorageAdapter(namespace)`: `load`, `save`, `list`, `remove`, keyed `vue-json-query-builder:<namespace>:current|saved`. Throws on an empty namespace (fix 5).

### Milestone 3: components (`src/components/`)

- [x] `QueryBuilder.vue` (exported as `VueJsonQueryBuilder` and default): props `fields`, `defaultQuery?`, `components?`, `operatorLabels?`, `maxDepth = 3`, `maxRules = 25`, `title?`, `collapsible?`, `runQuery?`, `showReset?`, `storage?`, `disabled?`; `defineModel<QueryGroup>()` and `defineModel<boolean>('valid')`. Slots: `header`, `footer`, `rule-value` (scoped). With no `modelValue`, emits `defaultQuery` or an empty AND group with one blank rule.
- [x] `QueryGroup.vue`: AND/OR `radiogroup`, Add rule, Add group (hidden at `maxDepth`; both disabled at `maxRules`), Remove group (nested only). Emits `update`/`remove`; never mutates props (fix 2). Deleting the last rule of a nested group removes the group; at the root it leaves one blank rule (fix 13).
- [x] `QueryRule.vue`: field select, operator select, value control(s) chosen by type, operator and `field.component`; `between` renders two controls labeled Min/Max (number) or From/To (date/time). Number controls emit numbers (fix 10). Unknown field: renders "Unknown field" with the value read-only, the rule invalid and removable (fix 7). Inline error for a reversed `between`: "Min must not exceed max" / "From must not be after To".
- [x] Default controls in `src/components/controls/`: `DefaultButton`, `DefaultSelect`, `DefaultInput`, `DefaultMultiSelect` (button + popover listbox with checkboxes, typeahead, Escape closes and restores focus, selected count in the button), `DefaultModal` (native `<dialog>`). All take the D8 props and use token utilities only.
- [x] Chrome: header renders when `title` is set, collapsible when `collapsible`; footer renders Run when `runQuery` is set (`loading` reset in `finally`, the tree `inert` while loading; fix 8) and Reset when `defaultQuery` and `showReset` are set. Adding a rule with empty `fields` is disabled with a hint instead of crashing (fix 9).
- [x] Saved queries (only with `storage`): Save dialog (name ≥ 2 chars), list dialog, delete with an in-dialog confirm that deletes by saved-query id (fix 6). The current tree persists through `storage.save` on change and loads through `storage.load` on mount when `modelValue` is not given.
- [x] No global or unscoped styles (fix 11). Spacing and border utilities use the `neutral-border`, `primary` and `danger` tokens.

### Milestone 4: accessibility (D11)

- [ ] Group and rule `role="group"` labels, visually hidden control labels (`sr-only`), remove-button labels, `radiogroup` with arrow-key handling.
- [ ] Focus: a new rule/group focuses its field select; removal focuses the previous sibling, else the parent's Add rule. Implemented through template refs, not DOM queries.
- [ ] Errors: `aria-invalid`, `aria-describedby` to the error text, one polite `aria-live` region per builder.

### Milestone 5: theme, demo, docs

- [ ] `src/theme.css`: `@theme default` for every token the templates use (`--color-primary`, `-hover`, `-active`, `-focus`, `--color-danger`, `-hover`, `--color-neutral-border`, `--color-neutral-light`, `--color-neutral-dark`, `--color-neutral-white`, `--color-light`, radius and font-size tokens). Derive the list with `grep -rhoE '(bg|text|border|ring|outline|fill)-[a-z-]+' src/components | sort -u` and keep it in sync.
- [ ] Demo (`demo/`, Vite app): the 0.1.x demo's fields migrated to v1, a "Generated query" panel, `localStorageAdapter`, Run/Reset, and a toggle between default controls and a sample custom control.
- [ ] README: install; Tailwind v4 setup (`@import "vue-json-query-builder/theme.css"` standalone, or `@source "../node_modules/vue-json-query-builder/dist"` when the app defines the tokens); tree and field formats; operator table; `components` contract (D8); helpers; storage adapter; accessibility notes; "Migrating from 0.1.x".

### Milestone 6: release

- [ ] Merge to `master`, push tag `v1.0.0-beta.0`, confirm the publish workflow runs and `npm view vue-json-query-builder@beta version` returns it.

## Tests (Vitest)

- Model: every helper, `idFor` stability across `updateNode`, `pruneIncomplete` edge cases, `migrateV0Query` on the 0.1.x demo query.
- Components: add/remove rule and group, AND/OR toggle, depth and rule caps, controlled replacement of `modelValue` re-renders, `valid` model, operator/field change resets, `between` and multi-select, custom `components` and per-field `component` receive the D8 props.
- One regression test per D10 fix, named `fix N: ...`.
- `vitest-axe` on default, nested and invalid renders; keyboard tests for focus moves and the radiogroup.

## Verification

- `npm run lint && npm run typecheck && npm test && npm run build`.
- `npm pack --dry-run` lists only `dist/`, `README.md`, `LICENSE`, `package.json`.
- Build the demo and build a nested OR query with the keyboard only.

## Files

`package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `src/index.ts`, `src/model/*`, `src/components/*`, `src/components/controls/*`, `src/theme.css`, `demo/*`, `tests/*`, `.github/workflows/{ci,publish,pages}.yml`, `README.md`. Deleted: everything listed in Milestone 1.
