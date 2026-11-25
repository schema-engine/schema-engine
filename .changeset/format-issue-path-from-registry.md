---
'@schema-engine/forms': patch
---

`formatIssuePath` now comes from `@schema-engine/registry` and `@schema-engine/forms` re-exports it, so one formatter serves every package. Its output for the paths it already took is unchanged, and it also takes the `{ key }` segments of a Standard Schema issue. The issues an agent tool reports for input that does not match the form now write array indexes in brackets (`rows[0].name`) instead of dots (`rows.0.name`).
