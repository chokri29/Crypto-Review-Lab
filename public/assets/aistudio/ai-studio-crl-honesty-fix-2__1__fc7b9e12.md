# CRL Honesty Fix 2 — AI Studio Task

Fix the remaining CRL honesty leftovers. Keep changes narrow; do not refactor unrelated UI/auth/database code.

## 1. No fabricated evaluation data

- In `src/App.tsx`, the two DB-tracked asset builders (~L485 and ~L640) still synthesize five sub-scores from `confidenceScore` (defaulting to 8) and set `confidenceScore: s?.confidenceScore ?? 90`. Remove all fabricated evaluation fields for unscored DB assets: do not derive sub-scores from confidence, and do not invent `confidenceScore`.
- Remove the unused `calculateBlueprintScore` import in `src/data.ts`.

## 2. Keep null as null in UI

Replace every `|| 'Low'` fallback on an editorial review with an explicit “Unrated” / “Not assessed” display, or omit the field. Do not reintroduce `Low`.

- `src/components/BlogPreviewer.tsx:845`
- `src/components/BlogPreviewer.tsx:2310`
- `src/components/F3Dashboard.tsx:448`
- `src/components/F3Dashboard.tsx:451`

## 3. Gate the chat verdicts

- In `src/components/AuditorChat.tsx` (~L267-282), stop rendering `${review.overallScore}/100` and `${review.riskLevel} Risk` for unrated reviews. Show `Pending`/`Unrated` and do not classify a null score/risk as PASS.

## 4. Remove the invented verification-score formula

- Delete the `(security * 7.0) + (utility * 2.5) + 2` formula clamped 58–98 used for `crlVerificationScore` in `src/components/ReviewLab.tsx` (~L967 and ~L2138), and make all associated displays say "Not performed" when no real verification result exists.

## 5. Stop committing test orders

- Restore `pro_orders.json` to `[]`.
- Change `src/tests/moneyPath.test.ts` so it runs against a temporary/overridden order file (env/path override), not the repo fixture, and resets/clears its data in a `finally` block.
- Verify no `PAID` sample client, private download token, or test email remains in `pro_orders.json`.

## 6. Remove accidental artifacts

Delete these accidentally committed files:

- `.aistudio/artifacts/brain/b73f5e87-3195-4af2-9196-7e0fdd24adf2/.tempmediaStorage/media_1792607313239_dc2c2057.jpg`
- `public/assets/aistudio/InShot_20261021_121508610_c8780ee6.mp4`
- `public/assets/aistudio/InShot_20261021_192044994_76f74868.jpg`
- `public/assets/aistudio/Screenshot_20261021-193320_57f7a89d.png`
- `app/applet/src/components/EvaluationBlueprintRubric.tsx` (and restore `tsconfig.json` exclusion if safe)

## Acceptance

1. `bun run check` passes.
2. No `|| 'Low'` remains in the named files for editorial/null risk paths.
3. No synthesized sub-scores or `confidenceScore ?? 90` in the two DB asset builders.
4. No 58–98 `crlVerificationScore` formula remains.
5. `pro_orders.json` is `[]` and the test never writes to it.
6. List every file changed; do not touch unrelated payment/auth/database logic or UI styling.
