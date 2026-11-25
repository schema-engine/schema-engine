---
'@schema-engine/layout': patch
---

Keep an item's `--se-item-display-mode` to that item: each grid now resets it, so the fields inside a fieldset that lays itself out as a grid stay `block` instead of turning into grids.
