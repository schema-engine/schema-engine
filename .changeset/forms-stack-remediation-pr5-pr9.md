---
'@schema-engine/forms': minor
'@schema-engine/forms-react': minor
'@schema-engine/forms-radiant': patch
---

Widget field schemas are colocated with default implementations (shadcn registry sources and `@schema-engine/forms-radiant`), not in `@schema-engine/forms`. Shared field-array adapter types live at `@schema-engine/forms/adapters`. `createReactFormEngine` is removed; use `createFormEngine` from `@schema-engine/forms`.
