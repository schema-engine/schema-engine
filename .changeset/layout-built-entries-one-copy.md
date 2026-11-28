---
'@schema-engine/layout': patch
---

The built package shares its code between its entries (`.` and `./testing`): `dist` holds shared modules once, in chunks, instead of a copy in every entry, so a module-level value is one value whichever entry imports it.
