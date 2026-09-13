---
'@schema-engine/forms-radiant': patch
---

Keep published JS free of CSS imports so Node can load the package. Hosts load Radiant UI styles themselves and first-party shell and field rules from `@schema-engine/forms-radiant/index.css`.
