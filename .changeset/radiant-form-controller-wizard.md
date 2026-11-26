---
'@schema-engine/forms-radiant': patch
---

`FormController` gains `wizard` and `submission`, signals over the form's wizard (`FormWizard`) and submission that read `undefined` while the form has no runtime and follow the runtime the instance replaces, and `clearSubmission()`. An element no longer needs `formInstanceContext` and `contextSelector` to build a stepper or read the submission. `formInstanceContext` and `FormInstanceContextValue` stay exported from `@schema-engine/forms-radiant/contexts` for the custom blocks and recipes of a renderer; `FormInstanceContextValue` now extends `FormWizard`, with the same fields as before.
