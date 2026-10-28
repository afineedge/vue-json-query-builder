# Reviewers — vue-json-query-builder

A Vue 3 + TypeScript + Tailwind v4 component library, published to npm, that builds nested
AND/OR queries as JSON. The first consumer is a Vue 3 + Vite + Tailwind v4 host app that injects
its own controls and keeps the query in the URL. The spec is `vue-json-query-builder-v1-spec.md`.

Domain tags for this repo: `code`, `ui-visual`.

## frontend
- **source:** shared:frontend
- **trigger:** always
- **weight:** high
- **tools:** read-only
- **addendum:** Vue 3.4+ `<script setup>`, `defineModel`, provide/inject, reactive proxies vs raw objects, immutable updates, row keys, and what ships in `dist/` (ESM build, types, Tailwind class scanning).

## qa
- **source:** shared:qa
- **trigger:** always
- **weight:** high
- **tools:** read-only
- **addendum:** Check each D10 bug fix really has a test that would fail without the fix; hunt edge cases in validation, pruning, storage, async runQuery, and a parent that replaces or ignores `v-model` updates.

## accessibility
- **source:** shared:accessibility
- **trigger:** always
- **weight:** high
- **tools:** read-only
- **addendum:** This is a web component, not a phone game: judge against WCAG 2.2 AA on desktop and mobile browsers, keyboard-only use, and screen readers (labels, roles, focus moves, live region, the listbox pattern).

## ui-ux
- **source:** shared:ui-ux
- **trigger:** always
- **weight:** normal
- **tools:** read-only
- **addendum:** The bare builder (no title, Run, or storage) must look complete inside a host page; judge the default controls, empty and error states, and the demo as a first impression.

## integrator
- **source:** inline
- **trigger:** always
- **weight:** high
- **tools:** read-only

You are the senior frontend engineer at the host app who will integrate this library next week.
Your app is Vue 3 + Vite + Tailwind v4 with CSS-first `@theme` tokens. You will inject your own
button, `{ value, text }` select, text input, modal, a date picker that uses a `value` prop and an
`input` event, and a comma-formatted currency input, mostly through adapters. You keep the tree in
the URL, replace `modelValue` on back/forward, and act only on `pruneIncomplete(tree)`. You pass no
`title`, `runQuery` or `storage`.

Read the spec's "Requirements from the first host app" section, the README, `src/index.ts`, the
public types, and the components. Judge: can you integrate it from the README alone; are the
props/emit contracts for injected components complete and unambiguous; will anything fight your
setup (Tailwind scanning, tokens, peer deps, ESM-only, SSR, bundle size); and where does the code
or the docs disagree with the spec. Flag API choices you'd regret after 1.0 makes them permanent.

## contrarian
- **source:** shared:contrarian
- **trigger:** meta
- **weight:** normal
- **tools:** read-only
- **addendum:** This is a beta for one known host app; separate what blocks `1.0.0-beta.0` from what can wait for 1.0, and push back on gold-plating.
