---
'@schema-engine/forms-radiant': patch
---

Centralize field constraint management in `se-form-instance`. Conditional fields are authored in SSR as plain wrapper elements (`<div class="se-form-constraint" data-se-constraint-field="..." hidden>`) without serialized JSON attributes or custom element wrappers (`<se-form-constraint>`). The active form instance subscribes to the form store and manages visibility reactively across all constrained fields.
