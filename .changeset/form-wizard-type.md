---
'@schema-engine/forms': patch
---

Adds the `FormWizard` type: the current step, every step's state, `navigating` and the commands `next`, `back` and `goTo`, which each renderer hands to its app (`useFormWizard()` in React, `FormController.wizard` in Radiant).
