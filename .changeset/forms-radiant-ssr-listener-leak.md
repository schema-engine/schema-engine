---
'@schema-engine/forms-radiant': patch
---

Stop attaching document-level `eco:after-swap` listeners, so Radiant's minimal SSR document environment no longer leaks EventTarget listeners. Each `se-field` restores its serialized validation rules when it connects; call `hydrateFieldRules(root)` to re-apply them to a swapped subtree.
