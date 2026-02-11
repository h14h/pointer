# Pitching Outcomes

## Source Files
- `src/lib/pitchingOutcomes.ts`
- `src/lib/pitchingOutcomeImport.ts`

## Dependencies
- [Types](types.md) — pitcher stat shape
- [Utilities](utilities.md) — optional baseball-IP normalization for estimators

## Dependents
- [CSV Upload Workflow](csv-upload-workflow.md) — applies optional import-time estimation

## Why This Exists

Many projection feeds omit one or more of `QS`, `CG`, and `ShO`. Pointer keeps missing outcomes at zero by default, but offers per-stat estimation in the upload preview so users can decide when inferred outcomes should be included.

## Import-Time Decision Model

Estimation is intentionally **front-loaded** into import:
- Missing coverage is detected from raw pitcher rows (`blank` or `invalid` values)
- User chooses stat-by-stat whether to estimate
- Only rows detected as missing are filled
- Provided values are never overwritten

This avoids hidden runtime behavior in scoring and makes inferred outcomes an explicit data-ingestion choice.

## Estimation Characteristics

`estimateQualityStarts`, `estimateCompleteGames`, and `estimateShutouts` are linear regressions using `GS`, adjusted `IP`, and `ERA`, with guardrails that return `0` for low-information inputs (notably `GS < 6`).

Relief-appearance IP adjustments are model-specific:
- QS uses 1.81 IP per relief appearance
- CG uses 1.59
- ShO uses 1.62

These differences come from independent fits rather than one shared coefficient set.

## Legacy Resolve Helpers

`resolveQualityStarts`, `resolveCompleteGames`, and `resolveShutouts` remain in the library for compatibility, but the primary app flow now relies on import-time estimation choices instead of runtime fallback during scoring/display.
