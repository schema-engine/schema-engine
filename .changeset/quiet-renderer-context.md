---
'@schema-engine/forms-radiant': patch
---

Stop `se-form-renderer` from warning about multiple engines on construction when the page creates more than one engine; it now publishes its engine context once `engine` is set.
