<INSTRUCTIONS>
## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- frontend-design: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics. (file: /Users/h14h/.agents/skills/frontend-design/SKILL.md)
- functional-design: Create highly functional, production-grade frontend interfaces logical hierarchies. Use this skill when the user asks to build interative elements in websites or applications (examples include forms, sortable tables and search inputs). Generates creative, polished code and UI design that maximizes visual clarity, emphasizes the most important elements, and leverages relative spacing to indicate logical groups. (file: /Users/h14h/.agents/skills/functional-design/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations. (file: /Users/h14h/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /Users/h14h/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.

## UI System

Before creating any new visual element, check `src/components/ui/` for an existing component. If none fits, check the **shadcn catalog** below — install and style a shadcn component before building from scratch. For token definitions, composition rules, and extraction thresholds, see [docs/ui-system.md](docs/ui-system.md).

### Installed Components

| Need | Component | Source | File |
|------|-----------|--------|------|
| Action button | `Button` | custom | `ui/Button.tsx` |
| On/off switch | `Toggle` | custom | `ui/Toggle.tsx` |
| Single/multi select | `MenuSelect` | custom | `ui/MenuSelect.tsx` |
| Compact pill selector | `PillDropdown` | custom | `ui/PillDropdown.tsx` |
| Modal dialog | `DialogShell` | custom | `ui/DialogShell.tsx` |
| Workflow dialog | `AppDialog` | shadcn/Base UI | `ui/AppDialog.tsx` |
| Mobile drawer | `AppSheet` | shadcn/Base UI | `ui/AppSheet.tsx` |
| Uppercase meta label | `FieldLabel` | custom | `ui/FieldLabel.tsx` |
| Text input | `Input` | shadcn/Base UI | `ui/input.tsx` |
| Status badge | `Badge` | shadcn/Base UI | `ui/badge.tsx` |
| Checkbox | `Checkbox` | shadcn/Base UI | `ui/checkbox.tsx` |
| Section heading | `SectionHeader` | custom | `ui/SectionHeader.tsx` |
| Bordered container | `Panel` | custom | `ui/Panel.tsx` |
| Page-width wrapper | `PageContainer` | custom | `ui/PageContainer.tsx` |
| Hover/focus help | `Tooltip` | custom | `ui/Tooltip.tsx` |
| Toast notification | `toast()` | sonner | `ui/sonner.tsx` |
| Classname merging | `cn()` | shadcn | `lib/utils.ts` |
| Legacy classname merging | `cx()` | custom | `ui/cx.ts` |

Custom components have shadcn equivalents (see [docs/ui-system.md](docs/ui-system.md)). When modifying a custom component substantially, consider migrating it to its shadcn equivalent instead.

### shadcn Component Catalog

Not-yet-installed components available via `bunx shadcn@latest add <name>`:

| Component | Description | Docs |
|-----------|-------------|------|
| Accordion | Collapsible content sections | [docs](https://ui.shadcn.com/docs/components/accordion) |
| Alert | Callout for user attention | [docs](https://ui.shadcn.com/docs/components/alert) |
| Alert Dialog | Modal interrupting with important content | [docs](https://ui.shadcn.com/docs/components/alert-dialog) |
| Aspect Ratio | Content within a desired ratio | [docs](https://ui.shadcn.com/docs/components/aspect-ratio) |
| Avatar | Image with user fallback | [docs](https://ui.shadcn.com/docs/components/avatar) |
| Breadcrumb | Hierarchical path links | [docs](https://ui.shadcn.com/docs/components/breadcrumb) |
| Button | Button or button-styled component | [docs](https://ui.shadcn.com/docs/components/button) |
| Button Group | Grouped related buttons | [docs](https://ui.shadcn.com/docs/components/button-group) |
| Calendar | Date or date-range selection | [docs](https://ui.shadcn.com/docs/components/calendar) |
| Card | Header, content, footer container | [docs](https://ui.shadcn.com/docs/components/card) |
| Carousel | Swipeable content carousel | [docs](https://ui.shadcn.com/docs/components/carousel) |
| Chart | Data visualization (Recharts) | [docs](https://ui.shadcn.com/docs/components/chart) |
| Collapsible | Expandable/collapsible panel | [docs](https://ui.shadcn.com/docs/components/collapsible) |
| Combobox | Autocomplete with suggestions | [docs](https://ui.shadcn.com/docs/components/combobox) |
| Command | Search and quick actions menu | [docs](https://ui.shadcn.com/docs/components/command) |
| Context Menu | Right-click action menu | [docs](https://ui.shadcn.com/docs/components/context-menu) |
| Data Table | TanStack Table datagrid | [docs](https://ui.shadcn.com/docs/components/data-table) |
| Date Picker | Date selection with presets | [docs](https://ui.shadcn.com/docs/components/date-picker) |
| Direction | Text direction provider | [docs](https://ui.shadcn.com/docs/components/direction) |
| Drawer | Side panel component | [docs](https://ui.shadcn.com/docs/components/drawer) |
| Dropdown Menu | Button-triggered action menu | [docs](https://ui.shadcn.com/docs/components/dropdown-menu) |
| Empty | Empty state display | [docs](https://ui.shadcn.com/docs/components/empty) |
| Field | Label + control + help text | [docs](https://ui.shadcn.com/docs/components/field) |
| Hover Card | Link preview on hover | [docs](https://ui.shadcn.com/docs/components/hover-card) |
| Input Group | Input with addons/buttons | [docs](https://ui.shadcn.com/docs/components/input-group) |
| Input OTP | One-time password input | [docs](https://ui.shadcn.com/docs/components/input-otp) |
| Item | Content with media and actions | [docs](https://ui.shadcn.com/docs/components/item) |
| Kbd | Keyboard input display | [docs](https://ui.shadcn.com/docs/components/kbd) |
| Label | Accessible form control label | [docs](https://ui.shadcn.com/docs/components/label) |
| Menubar | Persistent desktop-style menu | [docs](https://ui.shadcn.com/docs/components/menubar) |
| Native Select | Styled native HTML select | [docs](https://ui.shadcn.com/docs/components/native-select) |
| Navigation Menu | Website navigation links | [docs](https://ui.shadcn.com/docs/components/navigation-menu) |
| Pagination | Page navigation links | [docs](https://ui.shadcn.com/docs/components/pagination) |
| Popover | Rich content portal | [docs](https://ui.shadcn.com/docs/components/popover) |
| Progress | Task completion indicator | [docs](https://ui.shadcn.com/docs/components/progress) |
| Radio Group | Single-select button set | [docs](https://ui.shadcn.com/docs/components/radio-group) |
| Resizable | Resizable panel groups | [docs](https://ui.shadcn.com/docs/components/resizable) |
| Scroll Area | Custom cross-browser scrollbar | [docs](https://ui.shadcn.com/docs/components/scroll-area) |
| Select | Option list dropdown | [docs](https://ui.shadcn.com/docs/components/select) |
| Separator | Content section divider | [docs](https://ui.shadcn.com/docs/components/separator) |
| Sidebar | Themeable sidebar component | [docs](https://ui.shadcn.com/docs/components/sidebar) |
| Skeleton | Loading placeholder | [docs](https://ui.shadcn.com/docs/components/skeleton) |
| Slider | Range value selector | [docs](https://ui.shadcn.com/docs/components/slider) |
| Sonner | Toast notifications (Sonner) | [docs](https://ui.shadcn.com/docs/components/sonner) |
| Spinner | Loading state indicator | [docs](https://ui.shadcn.com/docs/components/spinner) |
| Switch | Toggle between two states | [docs](https://ui.shadcn.com/docs/components/switch) |
| Table | Responsive data table | [docs](https://ui.shadcn.com/docs/components/table) |
| Tabs | Tabbed content panels | [docs](https://ui.shadcn.com/docs/components/tabs) |
| Textarea | Form textarea component | [docs](https://ui.shadcn.com/docs/components/textarea) |
| Toast | Temporary message display | [docs](https://ui.shadcn.com/docs/components/toast) |
| Toggle | Two-state on/off button | [docs](https://ui.shadcn.com/docs/components/toggle) |
| Toggle Group | Set of toggle buttons | [docs](https://ui.shadcn.com/docs/components/toggle-group) |
| Tooltip | Hover/focus info popup | [docs](https://ui.shadcn.com/docs/components/tooltip) |
| Typography | Text element styles | [docs](https://ui.shadcn.com/docs/components/typography) |

### Installing a shadcn Component

1. `bunx shadcn@latest add <component-name>`
2. Component lands in `src/components/ui/<name>.tsx`
3. Review styling — adjust to use Pointer's token variables if the component introduces new color/spacing values
4. Update `docs/ui-system.md` Source Files and move the component from the catalog to the installed table above
5. Run `bun run test:ui && bun run build`

### Custom → shadcn Migration Map

When modifying an existing custom component substantially, prefer migrating to its shadcn equivalent:

| Custom Component | shadcn Equivalent | Notes |
|-----------------|-------------------|-------|
| `Button` | Button | Similar variant system |
| `Toggle` | Switch | shadcn Switch = Radix Switch |
| `MenuSelect` | Select or Dropdown Menu | Select for form values, Dropdown Menu for actions |
| `DialogShell` | Dialog or Alert Dialog | Dialog for general, Alert Dialog for confirmations |
| `FieldLabel` | Label | shadcn Label = Radix Label |
| `Panel` | Card | Card has header/content/footer structure |
| `Tooltip` | Tooltip | Both Radix-based |
| `sonner.tsx` | Sonner | Both wrap the sonner library |
| `PillDropdown` | *(no equivalent)* | Keep as custom — unique pill trigger pattern |
| `PageContainer` | *(no equivalent)* | Keep as custom — app-specific layout |
| `SectionHeader` | *(no equivalent)* | Keep as custom — app-specific section pattern |
| `NumericInput` | *(no equivalent)* | Keep as custom — domain-specific stepper |

## Quality Assurance
Before completing any code change, run all checks in order and fix any failures:
```bash
check whether any specs in docs/ or HOW.md need to be updated, then run:
bun run test && bun run test:ui && bun run test:visual && bun run lint && bun run build
```
- if your change adds or modifies visual elements: (1) check `src/components/ui/` for existing components, (2) check the shadcn catalog above for an installable component, (3) only build from scratch if neither option fits
- if you added, renamed, or removed a source file: verify it appears (or is removed) in the relevant spec's Source Files section and the HOW.md domain map
- review relevant specs/docs for code changes and update them if needed
- `bun run test` — unit tests for src/lib
- `bun run test:ui` — component/UI tests (Vitest)
- `bun run test:visual` — Playwright screenshot regression tests (see below)
- `bun run lint` — ESLint; zero errors required (warnings are acceptable when React Compiler handles the case)
- `bun run build` — Next.js build with TypeScript validation
See [HOW.md](HOW.md) for full QA documentation.

### Visual Regression Tests (Playwright)

Screenshot tests guard the leaderboard table against visual regressions. They compare the current rendering against known-good baseline images.

**When to run:** Any change that touches leaderboard styles, table layout, Tailwind classes, component structure, or CSS tokens. The `bun run test:visual` command is included in the standard QA sequence above.

**How they work:**
- A test fixture page at `src/app/(test)/leaderboard-visual/page.tsx` renders the `Leaderboard` component with deterministic data (no server dependency)
- Tests in `e2e/leaderboard.spec.ts` navigate to this page in different states and screenshot-compare against baselines in `e2e/leaderboard.spec.ts-snapshots/`
- Tolerance is tight (0.1% pixel diff) — real styling changes will fail, subpixel antialiasing won't
- Requires the dev server running on port 3000 (the standard `bun run dev`). Playwright reuses it automatically.

**Current baselines (5 tests):**

| Test | What it covers |
|------|---------------|
| Full container | Filter bar + spacing + table + pagination — catches layout and margin changes |
| Default view | All-players table with batting + pitching stat columns, PAR colors, row styling |
| Draft mode | Drafted row dimming, keeper row tinting, D/K badges |
| Pitchers view | Pitchers-only columns (K, W, SV, ERA, WHIP) |
| Scrolled horizontally | All 34 stat columns enabled, scrolled right — catches frozen column z-index, backgrounds, and edge shadows |

**Adding a new screenshot test:**
1. If needed, add a new `?variant=` parameter to `src/app/(test)/leaderboard-visual/page.tsx` and handle it in the `StoreSeeder`
2. Add a new `test()` block in `e2e/leaderboard.spec.ts` using the same pattern as existing tests
3. Run `bun run test:visual:update` to generate the baseline image
4. Verify the baseline looks correct, then commit it along with the test

**Important:** Never run `test:visual:update` to make failing tests pass. If a test fails, the visual output has changed — fix the code, not the baseline. Only use `test:visual:update` after intentional visual changes that you've manually verified.
</INSTRUCTIONS>
