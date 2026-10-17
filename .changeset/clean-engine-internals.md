---
'@schema-engine/forms': patch
'@schema-engine/forms-radiant': patch
---

The engine's field walk now identifies array containers by their registration, not by `$type`. Custom array element registrations must declare `containerKind: 'array'`; an element whose `$type` is `'arrayElements'` is no longer treated as an array without it. Custom schema catalogs are preserved when extending engines, and form callbacks and action plugin payloads are typed without implicit `any`.
