<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Behavioral scenarios (required gate for UI tasks)

`scenarios/` holds human-language Gherkin-style flows that an agent executes
by driving a real browser against the dev server. **Before marking any
UI-affecting task complete, execute the scenario files touching the affected
surfaces and report the run record** — this is part of the definition of
done, alongside `bun test src/lib`, `bun run test:ui`, and the Playwright
suite. Where possible the executing agent should not be the implementing
agent. See `scenarios/README.md` for the workflow contract, run/evidence
format, and the promotion pipeline (scenarios explore, Playwright tests in
`e2e/` lock).
