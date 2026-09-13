---
'@schema-engine/forms': minor
---

Allow `actions` slots on single-step recipes and add the shared `FormActionsConfig` slot schema.

Single-step recipes (`card`, `split-screen`, `hero-background`) previously rejected an `actions` slot, so their shells rendered no submit affordance and a single-step form could not be submitted from recipe chrome. They now accept an actions slot whose config is `FormActionsConfig` (`labels.submit` / `submitAriaLabel` / `submitting`, plus `align: 'start' | 'center' | 'end'`). The kind guard still rejects `progress` on single-step recipes and still requires `actions` on wizard recipes.
