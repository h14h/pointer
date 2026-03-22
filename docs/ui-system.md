# UI System

## Source Files
- `src/app/globals.css`
- `src/components/ui/Button.tsx`
- `src/components/ui/DialogShell.tsx`
- `src/components/ui/FieldLabel.tsx`
- `src/components/ui/MenuSelect.tsx`
- `src/components/ui/PageContainer.tsx`
- `src/components/ui/Panel.tsx`
- `src/components/ui/SectionHeader.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/ui/Toggle.tsx`
- `src/components/ui/cx.ts`

## Dependencies
- [Settings Page](settings-page.md) — first pilot surface that composes the shared primitives across page shell, section header, tabs, and inputs
- [Header](header.md) — pilot surface that uses shared buttons, menu selects, toggles, dialogs, labels, and page width

## Visual Intent

Pointer keeps its current editorial utility feel: restrained serif headings, clean sans body copy, red as the single strong accent, and a light/dark scheme that feels like the same product rather than two different themes.

This system is deliberately low-drift. It standardizes implementation and naming first, then uses that foundation to make later UI changes consistent.

## Token Model

Global styles own semantic tokens only. The important distinction is role, not hue:

- **App/background tokens** distinguish page background from raised surfaces and overlays.
- **Foreground tokens** distinguish default copy, muted explanatory copy, and subtle meta labels.
- **Border tokens** represent soft/default/strong separators so components do not hardcode opacity recipes.
- **Accent and danger tokens** share the same current red family, but remain separately named so future changes can diverge without touching component code.
- **Focus, backdrop, and shadow tokens** centralize interaction polish that was previously repeated in feature components.
- **Typography tokens** preserve the current serif-title and sans-body split without repeated inline font stacks.
- **Radius, page width, and page gutter tokens** standardize shell geometry while still allowing utility classes for local layout.

## Shared Patterns

The initial primitive set is intentionally small:

- **`PageContainer`** defines the standard application content width and horizontal gutters.
- **`SectionHeader`** standardizes page/section titles plus supporting copy and optional actions.
- **`Button`** covers the repeated action hierarchy: primary, secondary, ghost, destructive, and destructive-ghost.
- **`MenuSelect`** is the standard select-like control for both single-select and multi-select menus, including placement-aware popovers.
- **`Toggle`** is the standard switch control and supports the two geometries already present in the app (`sm` and `md`).
- **`FieldLabel`** standardizes uppercase meta labels used above fields and grouped controls.
- **`Panel`** provides a reusable container for muted or bordered surfaces without forcing full card abstraction.
- **`DialogShell`** centralizes destructive-confirmation modal structure and close affordances.
- **`Toaster`** mounts the shared Sonner toast surface used for lightweight confirmation and undo flows, and follows the app's system light/dark mode behavior.

These primitives are meant to carry the repeated visual recipes. Feature components still own structure and behavior.

## Current Baselines

The current visual baseline that should be preserved is:

- **Buttons** use `rounded-sm`, `text-xs`, uppercase copy, and `tracking-widest`.
- **Menu selects** use the same trigger/menu/item styling family as the header league selector.
- **Multi-select menus** use the same trigger as single-select plus a count badge and optional in-menu clear action.
- **Toggles** use the shared switch component instead of re-implementing track/thumb geometry in feature code.
- **Destructive actions** use the current red family; if the interaction is text-only or light-emphasis, use destructive-ghost rather than inventing a new red button style.

These are not redesign targets. They are the styles future work should inherit by default.

## Composition Rules

Use the layers in this order:

1. `src/app/globals.css`
   Semantic design tokens, focus styles, and truly global input resets.
2. `src/components/ui/*`
   Reusable visual primitives and shells with named variants.
3. Feature components
   Product-specific structure, content, state, and layout composition.
4. One-off classes
   Only for local layout or presentation that is not worth extracting yet.

Tailwind utilities remain the main composition tool. The system does not try to replace utility classes with giant CSS abstractions.

## UI Change Rules

- If a control is a standard button, toggle, or select-like menu, start with the shared primitive.
- If a new task exposes a mismatch between two visually equivalent controls, fix the primitive instead of introducing another one-off recipe.
- If a control needs custom behavior but should look standard, compose the shared primitive around that behavior rather than restyling from scratch.
- Do not change radius, letter-spacing, type scale, or border strength in feature code unless the work explicitly calls for a visual redesign.
- If a one-off visual treatment survives more than one use, extract it.

## Alignment Rule For Variable-Length Text

When a row mixes text with unpredictable length and small status or metadata elements, do not let the metadata float based on text length.

- Treat the row as two zones: a flexible left content block and a right-aligned status/actions block.
- Keep player names, labels, and other truncating text in the left block with `min-w-0` and truncation as needed.
- Push badges, short status tokens, counts, and controls into a trailing cluster using `ml-auto` and `shrink-0` so their horizontal position stays stable across rows.
- If a textual value needs to align numerically across rows, reserve width explicitly with `min-w-*` and use `font-mono tabular-nums`.
- If auxiliary text belongs conceptually with the primary label, keep it in the same block, but still reserve width or separate zones so neighboring controls do not drift.
- Prefer consistent columns or anchored edge alignment over visually centering each row independently.

This rule applies throughout the app: leaderboard status badges, keeper rows, draft context labels, and any future compact row UI with mixed text lengths.

## Extraction Threshold

Extract a visual pattern into shared UI when any of these are true:

- it already appears in 3 or more places
- upcoming work is likely to reuse it soon
- inconsistency would be user-visible
- the pattern is complex enough that copy/paste would drift

Keep styling local when it is feature-specific, unlikely to repeat, or abstraction would make the component harder to read than the duplicated styling it replaces.

## Exception Policy

Avoid hardcoded hex values, repeated font-family inline styles, and repeated border-opacity recipes inside feature components.

One-off classes are still acceptable for:

- local spacing/layout adjustments
- icon placement
- feature-only microstates
- structure that depends tightly on product behavior rather than visual reuse

If a component starts carrying the same visual recipe as another feature component, that is the signal to move the recipe into `src/components/ui/`.
