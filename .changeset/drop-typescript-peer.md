---
'@schema-engine/registry': patch
'@schema-engine/actions': patch
'@schema-engine/layout': patch
'@schema-engine/forms': patch
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
---

Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.
