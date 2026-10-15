---
'@schema-engine/forms-radiant': patch
---

Restore registry validators after SSR hydration and nested submit values. Preserve native submission without an onSubmit callback. Remove the legacy reviveRules export; hydrate engine rules through hydrateFieldRules instead.
