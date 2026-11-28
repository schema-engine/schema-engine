---
'@schema-engine/layout': patch
---

Recipe protocol violations, slot defaults that their slot schema rejects, slot defaults or appearance axes on a slot the recipe does not declare, and slot declarations that disagree with the recipe's slot schemas now throw `RegistryError` with code `'invalid-declaration'`. A slot schema that does not implement Standard Schema throws `'invalid-schema'`. The error identifies the recipe by kind and `$type`.
