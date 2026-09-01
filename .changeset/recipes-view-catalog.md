---
'@schema-engine/forms': major
'@schema-engine/forms-react': major
'@schema-engine/forms-radiant': major
---

Replace layout and stepper registrations with view recipes. Forms select a single
`view.$type`; built-in specs and slot schemas live on `@schema-engine/forms/recipes`
so the FormEngine entry does not load the catalog.
