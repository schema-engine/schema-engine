---
'@schema-engine/forms': minor
'@schema-engine/forms-react': patch
---

Unify validation emptiness and enforce declared rule options, including CIDR and phone. Async debounce state is field-scoped and superseded validations settle; global clear helpers are removed. Presets are exported as `ValidationPresets`; `ValidationRegistry.presets` and `initialize()` are removed. `validateForm` rejects rules without handlers with the field and rule type.

Replace `debounce(...)` with a caller-owned `createDebounceScope().debounce(...)`; its result distinguishes `{ status: 'completed', value }` from `{ status: 'skipped' }`. Replace `ValidationRegistry.initialize()` with `registerMultiple()`. React resolvers retain one debounce scope per resolver so separate forms do not cancel each other.

`relate` string/date comparisons coerce primitive values and `Date` instances;
arbitrary objects are not stringified through their custom conversion methods.
