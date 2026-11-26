---
'@schema-engine/forms-radiant': patch
---

Bind the elements to the contracts of `@schema-engine/forms/elements` instead of defining their schemas again. The 18 `*.types.ts` files now re-export the schemas, types, examples and `xFieldValue` declarations that moved to `@schema-engine/forms` (every name they exported is still exported from the same file, and the `Props` type of each component stays here), and `radiantElements`, a registry made with `bindRegistry(elementContracts, ...)`, adds the Radiant component of each element and the phone input's own validation. Every `XElementRegistration` (and `schemaFormRegistrations`, `FieldSetRegistration`, `ArrayElementRegistration`) is still exported from the same places, now taken from `radiantElements`: the same registration with the same `schema`, and its `schema`, `metadata` and value declaration are shared by identity with the contract. Its type is the contract merged with the Radiant binding rather than `InputRegistration<...>`; it is assignable to it.

The metadata description of several elements changes to the description shared with the other renderer, the `masked-input` value accepts a number or a date with `unmask: 'typed'` as well as text, and the package now depends on `@schema-engine/registry` (already a dependency of `@schema-engine/forms`).
