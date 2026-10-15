---
'@schema-engine/forms-radiant': minor
'@schema-engine/forms': patch
---

Render Radiant constraints against the form's nested defaults during SSR and preserve authored disabled fields during live updates. Remove the public `evaluateConstraintLogic` positional wrapper; use `evaluateConstraints({ constraints, values, fieldPath, baseRequired })` from `@schema-engine/forms/constraints` instead. Move `templatePath` beside the engine's path expansion utilities.
