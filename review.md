# Expert review: review mode, 2026-10-28

Scope: branch `v1` (master..v1, milestones 1–5) against `vue-json-query-builder-v1-spec.md`.

## Panel that ran

- **frontend** (high, always): Vue reactivity, packaging, rendering.
- **qa** (high, always): checked that each D10 fix has a test, and hunted edge cases.
- **accessibility** (high, always): WCAG 2.2 AA, keyboard and screen reader.
- **ui-ux** (normal, always): the bare builder in a host page, copy, and states.
- **integrator** (high, always): the host-app engineer integrating next week.
- **contrarian** (meta): attacked the consensus, and split findings into beta.0, before 1.0, and drop.

Every reviewer was read-only. None of them ran the code, so every repro here was traced by reading it.

## Per-reviewer summary

- **frontend:** a solid rewrite. Its sharpest findings:
  - You can't type decimals like `1.05` into the default number input. Vue writes `1` back over `1.0`.
  - A `null` or later-`undefined` `modelValue` blanks the builder for good.
  - A select value that isn't in the options counts as valid while the control shows it as empty.
- **qa:** 11 of the 13 D10 tests would fail if their fix were reverted. The fix 1 test passes even with the bug, and the fix 2 test may not fail. Other findings:
  - A parent that clones every update (for example through the URL) remounts every row on each keystroke.
  - `pendingFocus` goes stale when the parent drops an update.
  - A malformed tree crashes the builder.
- **accessibility:** the semantics are solid, but the defaults fail on:
  - Contrast: the focus ring is 1.80:1, control borders 1.47:1, and the multi-select's active option 1.09:1.
  - Forced-colors mode: `outline-none` plus box-shadow rings leaves no focus indicator.
  - Focus loss when Run is pressed and during the delete confirmation.
  - Text with `opacity-70`, and the placeholder.
- **ui-ux:** coherent, and the bare builder looks complete. Its findings:
  - Run is disabled with no reason shown.
  - The Save dialog's error line shifts the layout on blur, so the Cancel click misses.
  - Date wording such as "is greater than 2026-01-01".
- **integrator:** integrable from the README for the happy path. Its findings:
  - An empty or `null` URL value blanks the builder.
  - The README's URL example creates a feedback loop that erases in-progress rules.
  - `"80,000"` from a currency control becomes `null`.
  - `ValueControlProps.field` is typed as required but can be `undefined`.
  - The value shape for each type isn't in the control contract.
- **contrarian:** about half of the major findings concern chrome the host never renders (Run, Save, storage, the header) or the fallback colors in `theme.css`, which the host overrides. Its blockers are the URL round trip plus a null `modelValue`, the README contracts, and a non-color cue on the multi-select's active option. It also flagged that the spec transcription may be missing decisions after D11.

## Conflicts and how they resolved

1. **The default number input can't take decimals.** The contrarian wanted this conditional: block only if the host has a non-currency decimal field. **Overruled.** It's the default control of a public package, the demo uses it, it breaks for every user, and the fix is a few lines. *Dissent recorded.*
2. **Theme contrast and forced colors.** The contrarian called these after-beta, because the host defines its own tokens. **Split decision:**
   - **Forced colors goes into beta.** Swapping `outline-none` for `outline-hidden` is a one-class change, and it affects the host too, since it renders our radios, multi-select and remove buttons.
   - **Darkening the fallback hex values goes into beta.** It's a few hex values, and every standalone user gets those colors.
   - **The host's own token ratios** are documented, not fixed in code.

   *The contrarian dissented on the hex changes.*
3. **What Run should run.** UI/UX wants a looser rule: run the pruned tree whenever anything is runnable. Frontend and QA want stricter: `run()` refuses unless the query is valid. The host doesn't use Run. **Not resolved; left for the user** (open question 1).
4. **Select values that aren't in the options.** Frontend and QA want them validated. The contrarian says drop it, since the host encodes the tree as JSON and renders its own select. **Left for the user** (open question 3). The contrarian is right that query-string coercion should be dropped.
5. **Row-key matching for trees cloned from the URL.** QA wanted ids carried across by position. The contrarian says documenting the safe URL pattern is enough. **Contrarian wins:** D6 accepts new keys for a new tree, and the documented pattern stops the loop.
6. **Everything that only lives in the chrome** (Save dialog, delete-confirm focus, Run focus, storage hardening, a `run()` guard). **These move to after beta and before 1.0.** The host doesn't render them, but D1 publishes publicly, so they still have to be fixed before 1.0.

## Decided actions

### Before 1.0.0-beta.0

- [major] **Recover from a null or undefined `modelValue`.** Treat `model == null` as "no tree" at mount and whenever it becomes nullish later, and emit `initialQuery()`. Type the model as `QueryGroup | null`. (frontend, integrator, contrarian)
- [major] **README, the read side of the URL pattern.** Assign `modelValue` only when the URL tree differs from `pruneIncomplete(current)`. Wrap `JSON.parse` in try/catch. Explain that replacing `modelValue` with a pruned or re-parsed tree drops in-progress rules and remounts rows. (integrator, qa, contrarian)
- [major] **README, the value contract for each type.** Number controls emit `number | null`, and formatted strings like `"80,000"` become `null`. Dates emit `YYYY-MM-DD` and times emit `HH:MM`. Select values are the option's `value`. Store the tree as JSON. (integrator, qa, frontend, contrarian)
- [major] **Fix the default number input.** Keep a local draft string and don't write back while the parsed text equals `modelValue`. Add a test that simulates browser value sanitizing. (frontend)
- [major] **Give the multi-select's active option a non-color cue**, such as an inset ring or outline. (accessibility, contrarian)
- [major] **Replace `focus:outline-none` with `focus:outline-hidden`** (or switch to outline-based focus styles) so focus shows in forced-colors mode. (accessibility)
- [major] **Darken the `theme.css` fallbacks:** the focus ring to at least 3:1 against white and primary (`ring-offset-2` on filled buttons), and control borders to at least 3:1. Remove `opacity-70` text, and give placeholders a 4.5:1 color. (accessibility; contrarian dissent)
- [minor] **Make `ValueControlProps.field` optional** for the field and operator selects, or stop passing it, so a `props.field.x` read can't crash an adapter. (integrator)
- [minor] **Fix the danger button's hover token.** Use `hover:bg-danger-hover`, or correct the README claim. (integrator)
- [minor] **Rewrite the fix 1 test** so it fails with the bug in place: restore a tree from JSON, remove rule 1, and check the old Rule 2 element survives. **Make the fix 2 test assert zero errors** through an `errorHandler`. (qa)

### After beta, before 1.0

- [major] **Chrome accessibility and UX:**
  - keep focus on Run while loading (`aria-disabled`)
  - in the delete confirmation, focus the confirm Delete button, then return focus afterwards
  - in the Save dialog, focus the Name field first, and stop the error line shifting the layout on blur
  - announce failures
- [major] **Storage hardening:**
  - catch a synchronous throw from `load()`
  - guard `setItem` and quota errors
  - debounce and order the current-tree saves
  - show save and list errors
- [major] **Add a shape guard** on incoming and loaded trees (`null` children, `{}`, a missing `rules`) so they don't crash the builder. (qa, frontend)
- [minor] **Settle Run** (open question 1), the `save` API (open question 2) and select membership (open question 3) before the API freezes.
- [minor] **Inline errors** for an operator the field doesn't offer, and show the operator label instead of the raw key on unknown-field rules. (frontend, qa, ui-ux)
- [minor] **Clear `pendingFocus`** when the parent drops an update. Remove the custom arrow-key handler and rely on native radios. Debounce error announcements. (qa, accessibility)
- [minor] **Exports:** `isBetweenReversed`, `createGroup`, `ruleFor`, and the `LocalStorageAdapter` and `NodePath` types. Accept a readonly `fields` array. Type the `rule-value` slot. (integrator, frontend)
- [minor] **Copy and states:**
  - date and time wording, per type ("is after", "is before")
  - error punctuation
  - show the max-rules hint only once
  - an empty-state hint in Saved queries
  - one opacity value for disabled controls and buttons
  - a bigger target for the × remove button

  (ui-ux)

### Dropped

- Matching row keys by position for trees cloned from the URL.
- Coercing values for query-string URLs, and locale-aware currency parsing.
- SSR-safe ids and the Vue peer-range change, for an SPA-only beta. Note "SSR not supported" in the README.
- A per-builder id prefix for two builders sharing one tree object.
- Confirm or undo on Remove group, Load and Reset; a rule count in the collapsed header; a `time` range across midnight; demo badge colors.

## Open questions for the user

1. **What should Run do?**
   - (a) *Stricter, as now:* Run stays disabled until every rule is complete, and it sends the full tree. It's predictable, but Run greys out the moment you click Add rule.
   - (b) *Looser:* Run is enabled whenever `pruneIncomplete` leaves anything, and it sends the pruned tree. It matches the spec's "act only on the pruned tree" model.

   **Recommend (b), plus a short hint when nothing is runnable.** Users won't think the button is broken, and it matches how the host uses the tree.
2. **Should storage keep one `save` method or split it?**
   - (a) *Keep* `save(query, name?)`, which saves the current tree with no name and a named entry with one.
   - (b) *Split* into `persist(query)` for the current tree and `save(query, name)` for named entries.

   **Recommend (b), now while it's beta.** Anyone writing a server adapter from the method name alone would create a junk entry on every keystroke, and splitting it after 1.0 is a breaking change.
3. **Should a select value that isn't in the options count as valid?**
   - (a) *Keep it valid*, which suits options that load later.
   - (b) *Treat it as invalid when `options` is present*, with an inline "Unknown value" error, the same as an unknown field.

   **Recommend (b).** Today the user can run a filter the control shows as empty. Fields with remote options can leave out `options` and avoid the check.
4. **Are there decisions after D11 in the original spec?** My copy was typed from photos, and the photos jump from D11 to the host requirements. **Check the original before tagging the release.**

## Resolution, 2026-10-28

All the before-beta.0 actions are done, along with the recommendations for open questions 1–3. The checks pass: 146 tests, lint, typecheck, both builds, and the pack check. I also checked the changes in a real browser.

- **Null or undefined `v-model`:** the builder emits its starting tree on mount and whenever the tree is cleared later. Stored trees that aren't queries fall back to the starting tree.
- **README:** added the read side of the URL pattern, with a JSON parse guard and an identity check. Added the value contract for each type, the error rules, the new storage interface, the new helpers, and a Limits section (client-side only, the tree must keep its identity).
- **Number input:** the default input keeps a draft of what the user typed, so `1.0` and `1.05` can be entered. A test covers it.
- **Focus:** the default controls use outline-based focus styles (`outline-hidden` plus a solid 2px outline with a 2px offset), which show in forced-colors mode. The multi-select's active option gets a `primary` outline. The All/Any group gets an outline while focused.
- **`theme.css` fallbacks:** `--color-primary-focus` is now `#1d4ed8` (6.7:1) and `--color-neutral-border` is `#8a919c` (3.2:1). The `opacity-70` text is gone, and placeholders use `neutral-dark/80` (5.7:1).
- **Types:** `SelectControlProps` gives the field and operator selects an optional `field`. The danger button now uses `danger-hover`.
- **Tests:** the fix 1 test now fails with row keys removed, which I confirmed. The fix 2 test asserts zero errors.
- **Open question 1 → (b):** Run sends `pruneIncomplete(tree)`. It's enabled when something is complete and nothing is an error, and otherwise shows "Complete a rule to run the query." or "Fix the errors above to run the query.".
- **Open question 2 → (b):** `StorageAdapter` is now `load?`, `persist?`, `save(query, name)`, `list` and `remove`. Persist errors are ignored.
- **Open question 3 → (b):** a select value outside `options` is an error, with an inline message. A multi-select toggle drops unknown values. A field without `options` skips the check. Operators the field doesn't offer also show an inline error now.
- **Still open:** question 4, checking the original spec for decisions after D11.

## Resolution, before 1.0 items (1.0.0-beta.1)

Done:

- **Chrome:**
  - Run keeps focus while running (`aria-disabled`), and a failure is announced as "Query failed".
  - In Saved queries, Delete focuses the confirm button, Keep returns focus to Delete, and after a delete focus moves to the next entry (or to the empty-state message).
  - The Save dialog opens with focus on Name, and focus goes back there when the name is too short.
  - The error line is always rendered, so the buttons don't move when an error appears.
  - Save, list and remove failures show an inline error and are announced.
- **Storage:**
  - Current-tree writes run one at a time and skip to the latest tree.
  - A synchronous throw from `load()` is caught.
  - `persist` errors are ignored. Errors from `save`, `list` and `remove` reach the dialog, which covers quota errors from `setItem`.
- **Shape guard:** `isQueryShape` and `sanitizeQuery`. The builder repairs a malformed `v-model` value or stored tree, and doesn't render it until it's repaired.
- **Copy and states:**
  - date and time wording (`TYPE_OPERATOR_LABELS`, `operatorLabel`), with `operatorLabels` overrides still winning
  - periods on the range errors
  - the add-rule hint shown once, on the root group
  - the Saved queries empty-state hint
  - `opacity-60` for every disabled state
  - an `min-w-8` × remove button and a `size-8` dialog close button
  - unknown-field rules show the operator label instead of the raw key
- **Focus and announcements:**
  - `pendingFocus` is dropped when the parent ignores an update.
  - Errors are announced after a 600 ms pause.
  - Live-region messages are set 50 ms after the clear.
- **Types:** `fields` accepts a readonly array. The `rule-value` slot is typed as `RuleValueSlotProps`.

Changed from the plan: the All/Any arrow-key handler stays, because the spec asks for keyboard tests of the radio group. It now moves focus after the update renders, so the radio is already checked when a screen reader reads it. That fixes the announcement problem accessibility raised.
