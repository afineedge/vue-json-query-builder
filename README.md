# vue-json-query-builder

A Vue 3 component for building nested AND/OR queries as JSON. You give it a list of fields, and your users combine rules like "Price is at most 80,000" into groups. The component hands you the tree as plain JSON through `v-model`.

- Fully controlled: `v-model` is the only source of truth, so you can keep the query in the URL.
- Styled with Tailwind v4 utilities on semantic color tokens, so your theme applies with no extra CSS.
- Every control can be swapped for your own components.
- Keyboard operable and labeled for screen readers (WCAG 2.2 AA).

[Live demo](https://afineedge.github.io/vue-json-query-builder/)

> **v1 is a breaking rewrite of 0.1.x.** See [Migrating from 0.1.x](#migrating-from-01x).

## Install

```bash
npm install vue-json-query-builder
```

`vue` 3.4 or later is a peer dependency. The package ships ES modules and TypeScript types.

## Tailwind v4 setup

The components carry Tailwind utility classes but ship no compiled CSS. Your app's Tailwind build generates the styles. Pick one of these setups in your main CSS file.

**Your app doesn't define the tokens.** Import the package theme after Tailwind. It supplies fallback colors and tells Tailwind to scan the components:

```css
@import "tailwindcss";
@import "vue-json-query-builder/theme.css";
```

**Your app already defines the tokens** (see [Theme tokens](#theme-tokens)). Skip the theme and only point Tailwind at the package:

```css
@import "tailwindcss";
@source "../node_modules/vue-json-query-builder/dist";
```

Adjust the `@source` path so it's relative to your CSS file.

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VueJsonQueryBuilder, pruneIncomplete, type FieldDef, type QueryGroup } from 'vue-json-query-builder'

const fields: FieldDef[] = [
  { field: 'name', label: 'Name', type: 'text' },
  { field: 'price', label: 'Price', type: 'number' },
  { field: 'listed', label: 'Listed', type: 'date' },
  {
    field: 'state',
    label: 'State',
    type: 'select',
    options: [
      { value: 'MD', label: 'Maryland' },
      { value: 'VA', label: 'Virginia' },
    ],
  },
]

const query = ref<QueryGroup>()
const valid = ref(false)
</script>

<template>
  <VueJsonQueryBuilder v-model="query" v-model:valid="valid" :fields="fields" />
  <pre>{{ query && pruneIncomplete(query, fields) }}</pre>
</template>
```

With no `v-model` value, the builder emits a starting tree: `defaultQuery` if you pass one, otherwise an AND group with one blank rule for the first field.

## The query tree

A group holds a condition and a list of rules or nested groups. A rule holds a field, an operator and a value:

```json
{
  "condition": "and",
  "rules": [
    { "field": "state", "operator": "eq", "value": "MD" },
    {
      "condition": "or",
      "rules": [
        { "field": "price", "operator": "between", "value": [50000, 80000] },
        { "field": "tags", "operator": "any_of", "value": ["pool", "garage"] }
      ]
    }
  ]
}
```

- `condition` is `"and"` or `"or"`.
- `between` takes a `[min, max]` pair.
- `in`, `not_in`, `any_of`, `all_of` and `none_of` take a non-empty array.
- Every other operator takes one value. Number fields always hold numbers.
- A blank value is `null`, `[null, null]` for `between`, or `[]` for a list operator.

The tree contains only these properties. Row keys are tracked outside it, so the JSON stays clean.

### Complete, valid and errors

- A rule is **complete** when it has every value its operator needs.
- A rule is **valid** when it's complete and has no error.
- A half-filled rule is never an error. These four are errors, and each one shows an inline message on its rule:
  - The field isn't in `fields`.
  - The field doesn't offer the operator.
  - A select value isn't one of the field's `options`. Leave `options` out, for example when the choices load remotely, to skip this check.
  - A `between` range is reversed: min above max, or From after To.

## Field definitions

| Property | Type | Description |
| --- | --- | --- |
| `field` | `string` | The key written to each rule's `field`. |
| `label` | `string` | The name shown in the field select. |
| `type` | `'text' \| 'number' \| 'date' \| 'time' \| 'select'` | Picks the default operators and value control. |
| `operators` | `Operator[]` | Replaces the type's default operators. The first one is the default for a new rule. |
| `operatorLabels` | `Partial<Record<Operator, string>>` | Labels for this field's operators, for example `{ gte: 'at least', lte: 'at most' }`. They win over the builder's `operatorLabels`. |
| `options` | `{ value: string \| number, label: string }[]` | Choices for a `select` field. |
| `multiValued` | `boolean` | On a `select`, switches the default operators to `any_of`, `all_of` and `none_of`. |
| `inputType` | `string` | The native input type for a text field, for example `email` or `tel`. |
| `component` | `Component` | Replaces the value control for this field only. See [Custom components](#custom-components). |
| `placeholder` | `string` | Placeholder text for the value control. |

Dates are `YYYY-MM-DD` strings and times are `HH:MM` (or `HH:MM:SS`) strings, as native inputs produce them. A date must be a real calendar date: `2026-02-30`, `"x"` or a number leaves the rule unfinished, so it's pruned rather than shown as an error.

## Operators

| Operator | Default label | Value | Default for |
| --- | --- | --- | --- |
| `eq` | is | one | text, number, date, time, select |
| `neq` | is not | one | text, number, date, time, select |
| `contains` | contains | one | text |
| `not_contains` | does not contain | one | text |
| `starts_with` | starts with | one | text |
| `ends_with` | ends with | one | text |
| `not_starts_with` | does not start with | one | text |
| `not_ends_with` | does not end with | one | text |
| `gt` | is greater than (date and time: is after) | one | number, date, time |
| `lt` | is less than (date and time: is before) | one | number, date, time |
| `gte` | is at least (date: is on or after, time: is at or after) | one | number, date, time |
| `lte` | is at most (date: is on or before, time: is at or before) | one | number, date, time |
| `between` | is between | `[min, max]` | number, date, time |
| `in` | is any of | array | select |
| `not_in` | is none of | array | select |
| `any_of` | has any of | array | multi-valued select |
| `all_of` | has all of | array | multi-valued select |
| `none_of` | has none of | array | multi-valued select |

Change the labels with the `operatorLabels` prop, for example `:operator-labels="{ eq: 'equals' }"`. Your labels apply to every field type and win over the date and time wording. To change them for one field only, set that field's `operatorLabels`, which wins over both.

Changing a rule's operator keeps its value when the new operator takes the same kind of value, and clears it otherwise. Changing a rule's field resets the operator to the field's first operator and clears the value.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `v-model` | `QueryGroup \| null` | | The query tree. `null` or `undefined` means no tree: the builder then emits a starting tree, both on mount and if you clear it later. |
| `v-model:valid` | `boolean` | | Whether every rule is complete and valid, every field is known, and no group is empty. |
| `fields` | `FieldDef[]` | required | The fields users can query. |
| `defaultQuery` | `QueryGroup` | | The starting tree when there's no `v-model` value, and what Reset restores. |
| `components` | `ComponentMap` | | Replacement controls. See [Custom components](#custom-components). |
| `operatorLabels` | `Partial<Record<Operator, string>>` | | Overrides for the operator labels. |
| `maxDepth` | `number` | `3` | Group nesting levels, counting the root. Add group is hidden at this depth. |
| `maxRules` | `number` | `25` | Rules allowed in the whole tree. Add rule and Add group are disabled at this count. |
| `title` | `string` | | Shows a header with this title. |
| `collapsible` | `boolean` | `false` | Lets users collapse the builder from its header. Needs `title`. |
| `runQuery` | `(query: QueryGroup) => unknown` | | Shows a Run query button. Run sends the pruned tree, and works whenever a rule is complete and no rule has an error. Otherwise it's disabled, with a hint saying why. While its promise is pending, the builder is disabled and inert. |
| `showReset` | `boolean` | `false` | Shows a Reset button. Needs `defaultQuery`. |
| `storage` | `StorageAdapter` | | Persists the current tree and shows the save and load buttons. See [Storage](#storage). |
| `disabled` | `boolean` | `false` | Disables every control. |

The header, footer and their buttons appear only when you pass the props they need. With none of them, the builder renders the group and rule tree alone.

### Slots

| Slot | Scope | Replaces |
| --- | --- | --- |
| `header` | `{ title, collapsed, toggle }` | The default header. |
| `footer` | `{ run, reset, loading, valid, runnable }` | The default footer (save and load buttons, Reset, Run query). `run` does nothing unless `runnable` is true. |
| `rule-value` | `RuleValueSlotProps`: the [value control props](#value-controls) plus `rule` and `update(value)` | Every rule's value control. |

## Keeping the query in the URL

Because the builder is fully controlled, you can replace `v-model` at any time, for example when the user navigates back. Store the tree as JSON, so numbers stay numbers. Act on the pruned tree, so a half-filled rule never counts as an error.

Writing to the URL and reading it back need one guard. Writing the pruned tree to the URL triggers your route watcher. If that watcher then assigns the URL's tree to `v-model`, it does two things:

- It replaces what the user is typing with the pruned copy, so their half-filled rule disappears.
- It gives the builder a brand-new object, so every row remounts and focus is lost.

To avoid both, only assign the URL's tree when it differs from what the builder already has:

```ts
import { pruneIncomplete, type QueryGroup } from 'vue-json-query-builder'

const query = ref<QueryGroup | null>(null)
const pruned = (tree: QueryGroup | null) => (tree ? pruneIncomplete(tree, fields) : null)

// Builder → URL
watch(query, (tree) => {
  const usable = pruned(tree)
  router.replace({ query: usable ? { q: JSON.stringify(usable) } : {} })
})

// URL → builder, for Back/Forward and shared links
watch(
  () => route.query.q,
  (q) => {
    let fromUrl: QueryGroup | null = null
    try {
      fromUrl = typeof q === 'string' ? JSON.parse(q) : null
    } catch {
      // A hand-edited or truncated URL: treat it as no query.
    }
    if (JSON.stringify(fromUrl) !== JSON.stringify(pruned(query.value))) query.value = fromUrl
  },
  { immediate: true },
)
```

Setting `query` to `null` is safe: the builder emits its starting tree. So is a malformed tree, such as a hand-edited URL: the builder drops the bad nodes and emits the repaired tree (or its starting tree if nothing usable is left).

`pruneIncomplete` also drops rules that have an error. To hold off while the user has an error on screen, check `queryHasErrors(tree, fields)`.

## Theme tokens

The components use only these color tokens. Define them in your app's `@theme`, or import `theme.css` for fallbacks:

| Token | Used for |
| --- | --- |
| `--color-primary`, `-hover`, `-active` | Primary buttons, the selected All/Any option, checked options |
| `--color-primary-focus` | Focus outlines (needs 3:1 against your page background) |
| `--color-danger`, `-hover`, `-active` | Remove buttons and error text |
| `--color-neutral-border` | Control, rule and group borders (needs 3:1 against white to meet WCAG 1.4.11) |
| `--color-neutral-white` | Control and rule backgrounds |
| `--color-neutral-very-light` | The root group background |
| `--color-neutral-light` | Nested group backgrounds, hover states |
| `--color-neutral-dark` | Text |
| `--color-light` | The active option's background in the multi-select (it also gets a `primary` outline) |

The theme also sets `--radius`, `--radius-sm` and the `--text-xs` to `--text-lg` sizes, matching Tailwind's defaults. Because it uses `@theme default`, any token your app defines wins.

### Column widths

On screens 640px and wider, the field and operator selects sit in fixed-width columns, 11rem each by default. To fit longer field labels, set these CSS variables on the builder or any ancestor:

```css
.deal-search {
  --vjqb-field-width: 15rem;
  --vjqb-operator-width: 12rem;
}
```

Hosts that don't set them see no change.

## Custom components

Pass your own controls through the `components` prop. Any key you leave out uses the default.

```ts
import type { ComponentMap } from 'vue-json-query-builder'

const components: ComponentMap = {
  button: AppButton,
  select: AppSelectAdapter,
  input: AppInput,
  number: CurrencyInput,
  date: AppDatePickerAdapter,
  modal: AppModal,
}
```

| Key | Default | Used for |
| --- | --- | --- |
| `button` | Native button | Every button |
| `select` | Native `<select>` | The field and operator selects, and single-value select fields |
| `input` | Native input | Text fields |
| `multiSelect` | Listbox popover | List operators on select fields |
| `multiSelectTrigger` | Native button with a chevron | Only the button that opens the default multi-select. The listbox and its keyboard behavior stay the library's. |
| `number` | Native number input | Number fields |
| `date` | Native date input | Date fields |
| `time` | Native time input | Time fields |
| `modal` | Native `<dialog>` | The save and saved-queries dialogs |

To replace the control for one field only, set that field's `component`.

If you give a text, number, date or time field a list operator such as `in`, it keeps its usual control with `multiple: true`. The default controls then take comma-separated values.

### Value controls

Value controls receive these props (`ValueControlProps`) and emit `update:modelValue`:

| Prop | Type | Description |
| --- | --- | --- |
| `modelValue` | `unknown` | The current value. For `between`, each of the two controls gets one end. |
| `field` | `FieldDef` | The rule's field definition. |
| `operator` | `Operator` | The rule's operator. |
| `options` | `SelectOption[]` | The choices, for selects. |
| `multiple` | `boolean` | `true` for list operators, where the value is an array. |
| `id` | `string` | A unique id for the focusable element. |
| `ariaLabel` | `string` | The accessible name: Field, Operator, Value, Min, Max, From or To. Put it on the focusable element. |
| `ariaDescribedby` | `string` | The id of the rule's error message, when there is one. |
| `ariaInvalid` | `boolean` | Whether this control's value is the problem (an unknown option or a reversed range). |
| `disabled` | `boolean` | Whether the control is disabled. |

Emit values in these shapes. Anything else leaves the rule incomplete, so it's silently pruned:

| Field type | Emit |
| --- | --- |
| `text` | A string |
| `number` | A finite number, or `null` when blank. A plain numeric string such as `"80000"` is converted. A formatted one such as `"80,000"` becomes `null`, so strip separators in your control (see `demo/components/CurrencyInput.vue`). |
| `date` | A real calendar date as a `YYYY-MM-DD` string. Not a `Date` object. Anything else leaves the rule unfinished. |
| `time` | An `HH:MM` or `HH:MM:SS` string (24-hour) |
| `select` | One option's `value`, or an array of them for list operators |

The `select` control receives the same props (`SelectControlProps`), with one difference. For a rule whose field isn't in `fields`, the field and operator selects get `field: undefined`, so read it with `props.field?.…`.

### Multi-select trigger

To make the default multi-select match your own controls, replace only its button with `components.multiSelectTrigger`. You keep the library's listbox, with its typeahead, arrow keys, Home/End, Escape and screen reader support.

The trigger receives these props (`MultiSelectTriggerProps`):

| Prop | Type | Description |
| --- | --- | --- |
| `open` | `boolean` | Whether the listbox is open, for example to rotate a chevron. |
| `label` | `string` | What to show: the selected option's label, "N selected", or the placeholder. |
| `empty` | `boolean` | `true` when nothing is selected, so `label` is the placeholder. |
| `disabled` | `boolean` | Whether the control is disabled. |

The listbox's `id`, `aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-label`, `aria-describedby`, `aria-invalid`, and its `click` and `keydown` handlers arrive as attributes. Render a single root `<button>`, which Vue gives them to by default, and don't declare `click` or `keydown` in `emits`. Expose `focus()` or keep the button as the root, so Escape can return focus to it.

```vue
<script setup lang="ts">
import type { MultiSelectTriggerProps } from 'vue-json-query-builder'
defineProps<MultiSelectTriggerProps>()
</script>

<template>
  <button type="button" class="app-select" :disabled="disabled">
    <span :class="{ 'app-select__placeholder': empty }">{{ label }}</span>
    <AppChevron :up="open" />
  </button>
</template>
```

### Buttons and modals

- **`button`** receives `variant` (`'primary' | 'secondary' | 'danger'`), `disabled`, `ariaLabel` and `type`. Its default slot is the label, and it emits `click`. Pass other attributes (such as `aria-describedby`) through to the `<button>`, which Vue does by default for a single-root component.
- **`modal`** receives `open` and `title`, has a default slot for the body and a `footer` slot, and emits `update:open` with `false` when the user dismisses it.

### Focus

When a rule or group is added or removed, the builder moves focus into a control. For that to work with your components, each one must either expose a `focus()` method (`defineExpose({ focus })`) or render a focusable root element.

### Adapters

When your component has a different API, wrap it in a small adapter. For example, a select that takes `{ value, text }` options and a `value` prop:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ValueControlProps } from 'vue-json-query-builder'
import AppSelect from './AppSelect.vue'

const props = defineProps<ValueControlProps>()
defineEmits<{ 'update:modelValue': [value: unknown] }>()
const items = computed(() => props.options?.map((o) => ({ value: o.value, text: o.label })) ?? [])
const inner = ref()
defineExpose({ focus: () => inner.value?.focus() })
</script>

<template>
  <AppSelect
    ref="inner"
    :value="modelValue"
    :items="items"
    :input-id="id"
    :aria-label="ariaLabel"
    :aria-describedby="ariaDescribedby"
    :aria-invalid="ariaInvalid"
    :disabled="disabled"
    @input="$emit('update:modelValue', $event)"
  />
</template>
```

## Helpers

| Export | Description |
| --- | --- |
| `isQueryValid(tree, fields)` | `true` when every rule is complete and valid, every field is known, and no group is empty. |
| `isRuleComplete(rule, field)` | `true` when the rule has every value its operator needs. Numbers must be finite. |
| `isRuleValid(rule, field)` | Complete, with no error. |
| `ruleProblem(rule, field)` | The rule's error, `'field'`, `'operator'`, `'value'` or `'range'`, or `null`. A half-filled rule has none. |
| `queryHasErrors(tree, fields)` | `true` when any rule has an error the user must fix. Blank rules don't count. |
| `isBetweenReversed(rule, field)` | `true` for a complete `between` whose min is above its max. |
| `isIsoDate(value)`, `isTime(value)` | The date and time checks the builder uses: a real `YYYY-MM-DD` date, and `HH:MM` or `HH:MM:SS`. |
| `unknownValues(rule, field)` | A select rule's values that aren't in the field's options. |
| `createGroup(fields)` | An AND group with one blank rule for the first field. |
| `isQueryShape(value)` | `true` when a value is a well-formed tree all the way down. Use it on trees from a URL or storage. |
| `sanitizeQuery(value)` | A copy of a malformed tree with bad nodes dropped and unknown conditions set to AND, or `null`. |
| `operatorLabel(operator, field?, overrides?)` | The label the builder shows for an operator: the field's `operatorLabels`, then `overrides`, then the date and time wording, then the default. |
| `ruleFor(field)` | A blank rule for a field. |
| `pruneIncomplete(tree, fields)` | The tree without incomplete or invalid rules and the groups they leave empty, or `null` if nothing is left. |
| `operatorsFor(field)` | The operators a field offers, in order. |
| `migrateV0Query(v0)` | Converts a 0.1.x tree to v1. Throws on an unknown operator. |
| `localStorageAdapter(namespace)` | A `StorageAdapter` backed by `localStorage`. |
| `DEFAULT_OPERATORS`, `DEFAULT_OPERATOR_LABELS`, `TYPE_OPERATOR_LABELS`, `MULTI_VALUE_OPERATORS` | The built-in operator lists, labels, per-type wording and list operators. |

All the types (`QueryGroup`, `QueryRule`, `FieldDef`, `Operator`, `ComponentMap`, `ValueControlProps`, `SelectControlProps`, `StorageAdapter`, `LocalStorageAdapter`, `SavedQuery` and more) are exported too.

## Storage

Pass a `storage` adapter to let users save and load named queries. It can also keep the current tree as it changes and load it on mount when there's no `v-model` value.

```ts
import { localStorageAdapter } from 'vue-json-query-builder'

const storage = localStorageAdapter('listings') // keys: vue-json-query-builder:listings:current and :saved
```

To store queries somewhere else, write your own adapter. Each method can return a value or a promise:

```ts
interface StorageAdapter {
  load?(): QueryGroup | null | Promise<QueryGroup | null> // the current tree, read on mount
  persist?(query: QueryGroup): void | Promise<void> // the current tree, written on every change
  save(query: QueryGroup, name: string): SavedQuery | Promise<SavedQuery> // a named entry
  list(): SavedQuery[] | Promise<SavedQuery[]>
  remove(id: string): void | Promise<void>
}
```

- `load` and `persist` are optional. Leave them out if you only want named queries.
- `persist` runs on every change. The builder runs one write at a time and skips straight to the latest tree, so writes never land out of order. Its errors are ignored, so they never break editing.
- If `save`, `list` or `remove` fails, the dialog shows the error message and announces it.
- `save` adds an entry `{ id, name, query, savedAt }`.
- `remove` deletes by `id`.
- If `load` returns something that isn't a query, the builder uses its starting tree instead.

## Accessibility

- Each group is a `role="group"` named "Group: match all of the following" (or "any"). Each rule is a group named "Rule N".
- The All/Any toggle is a radio group. The arrow keys move between the options and select them.
- Every control has an accessible name, and each remove button is named, for example "Remove rule 2".
- Adding a rule or group moves focus to its field select. Removing one moves focus to the previous sibling, or to the group's Add rule button.
- Errors set `aria-invalid` and point to their message with `aria-describedby`.
- Focus indicators are outlines with an offset, so they still show in Windows High Contrast (forced-colors) mode. The `theme.css` fallbacks meet 3:1 for focus outlines and control borders.
- One polite live region per builder announces added and removed rules and groups, new errors, and save, load, reset and run actions.
- The multi-select follows the listbox pattern: the arrow keys, Home and End, and typeahead move through the options, Space or Enter toggles one, and Escape closes the list and returns focus to its button.
- While `runQuery` is pending, the tree is `inert`, so keyboard input can't change it. Run keeps focus (it's `aria-disabled`, not disabled), and a failure is announced.
- In Saved queries, Delete moves focus to the confirm button, Keep returns it to Delete, and after a delete focus moves to the next entry. The Save dialog opens with focus on the Name field.
- New inline errors are announced once typing pauses, so an error that flickers while you type isn't read out on every keystroke.

## Limits

- **Client-side only.** Element ids are generated at runtime, so server-rendered markup won't match on hydration. Render the builder only on the client, for example inside `<ClientOnly>` in Nuxt.
- **The tree must keep its identity.** Row keys follow the objects in the tree. Hand back the objects the builder emitted (see [Keeping the query in the URL](#keeping-the-query-in-the-url)). Re-parsing the tree on every change remounts every row.

## Migrating from 0.1.x

v1 is a rewrite for Vue 3, and nearly every API changed.

| 0.1.x | v1 |
| --- | --- |
| Vue 2 plugin, `Vue.use(VueJSONQueryBuilder)` | Vue 3 component, `import { VueJsonQueryBuilder }` |
| BootstrapVue styling | Tailwind v4 utilities on theme tokens |
| `options` prop: `{ id, name, type, options: [{ id, name }] }` | `fields` prop: `{ field, label, type, options: [{ value, label }] }` |
| `query` prop plus `v-model` that only emitted | One controlled `v-model` |
| Rules: `{ id, operator: '=', value }` | Rules: `{ field, operator: 'eq', value }` |
| `month`, `phone` and `email` types | `text` with `inputType: 'email'` or `'tel'`. `month` is gone. |
| `storage="name"` string | `storage` adapter, for example `localStorageAdapter('name')` |
| Any select value accepted | A select value must be one of the field's `options`, or the rule shows an error |
| Slots per type (`number`, `select`, ...) | `components` prop, a field's `component`, or the `rule-value` slot |

Convert saved 0.1.x trees with `migrateV0Query`:

| 0.1.x | v1 |
| --- | --- |
| `=`, `!=` | `eq`, `neq` |
| `()`, `!()` | `contains`, `not_contains` |
| `(`, `)` | `starts_with`, `ends_with` |
| `!(`, `!)` | `not_starts_with`, `not_ends_with` |
| `>`, `<`, `>=`, `<=` | `gt`, `lt`, `gte`, `lte` |
| `in`, `not in` | `in`, `not_in` |

Queries saved under 0.1.x's `VueJSONQueryBuilder_stored_*` and `VueJSONQueryBuilder_saved_*` keys aren't read by `localStorageAdapter`. Migrate them yourself if you need them.

## Development

```bash
npm install
```

```bash
npm run dev
```

| Script | Does |
| --- | --- |
| `npm run dev` | Serves the demo app. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `vue-tsc`. |
| `npm test` | Vitest, including axe accessibility checks. |
| `npm run build` | Builds the library and its types to `dist/`. |
| `npm run build:demo` | Builds the demo to `demo/dist/`. |

Pushing a `v*` tag publishes to npm through npm trusted publishing (no token secret). Prerelease versions go to the `beta` tag. The tag must match the version in `package.json`.

## License

ISC
