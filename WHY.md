# Why Pointer Exists

## The Short Version

Pointer helps fantasy baseball players confidently identify the best players for their specific league. It exists because no free tool combines projections with league-specific settings into a customized ranking without friction. I built it because I love baseball, I love coding, and I love the math of optimizing draft decisions.

## The Problem

### Existing platforms are locked ecosystems

Major fantasy platforms only work with their own projections and their own scoring systems. If your league uses custom rules — and most serious leagues do — you can't get accurate player valuations from the platform itself. You're left guessing, or doing mental math on the fly.

### The alternatives are slow and fragile

The free alternatives tend to be spreadsheet-based: no scoring customization, laggy interactions, and a brittle experience that breaks under any real usage. Searching for a player shouldn't take seconds. Sorting a column shouldn't freeze the screen. Marking a player as drafted shouldn't feel like a chore.

### Draft day is real-time and unforgiving

Each pick has a hard time limit. During that window, you need to mark the player just drafted, re-evaluate the board, and decide your pick. Every second spent fighting a tool is a second stolen from making a decision. A draft tool that can't keep up with a live draft is worse than no tool at all.

## What Pointer Values

These are listed in priority order. When two values conflict, the higher-priority value wins.

1. **League-specific player valuation.** The core purpose. Help users confidently identify the best players for *their* league by combining projections with their league's specific settings and context. Every feature should serve this goal.

2. **Performance under pressure.** Draft day demands instant interactions. Sort, filter, search, and draft operations must feel immediate. Lag is the enemy.

3. **Flexibility of input.** Users bring their own data from any source, in any format. The app should handle it without manual configuration. League settings must be fully customizable to match any league's rules.

4. **Simplicity of interface.** The app should feel focused, not overwhelming. Resist complexity that doesn't serve the core purpose. New capabilities should integrate naturally rather than adding cognitive load.

5. **Client-side autonomy.** Core functionality requires no backend. Data stays in the user's browser. No privacy concerns, no infrastructure to maintain.

6. **Correctness of calculations.** Baseball has edge cases. Handle them. When ambiguous, match how major platforms interpret the rules. Trust in the numbers is foundational.

## Who This Is For

Competitive fantasy baseball players who want more control over draft preparation than what hosting platforms provide. They understand projection data and scoring weights. They care about marginal advantages in player valuation. They want a tool that keeps up with them, not one that slows them down.

## What Success Looks Like

- Getting from zero to a ranked, scored board is fast and frictionless.
- Interactions feel instant, even with large datasets.
- Draft-day operations are single-action with immediate feedback.
- Changing settings updates everything in real time.
- Data is persistent and reliable.
- The app works without depending on external services.
- Usable on any screen size.

## The Bigger Picture

Pointer aims to be the most useful draft preparation tool available, sitting at the intersection of baseball and math. The specific features and technical choices will evolve, but the purpose — helping users make confident, informed draft decisions for their league — does not.
