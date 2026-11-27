---
'@schema-engine/registry': patch
---

Type the success of `safeParseNode` by the registry's registrations. `SafeParseNodeResult` now has one success member per registration, with `data` typed as that registration's schema output (`StandardSchemaV1.InferOutput`), so a registry typed by its registrations gives `data` its real type with no cast. A registry typed as `ReadOnlyRegistry<BaseRegistration>` still gives `unknown`.

The success also carries `$type`, the node's `$type`, because TypeScript narrows a union only by a property of the union itself: `if (parsed.success && parsed.$type === 'card')` narrows `parsed.registration` and `parsed.data` to the `card` registration, while `parsed.registration.$type === 'card'` does not narrow `parsed.data`.

`createRegistry` now declares its type parameter `const`, so an inline list keeps the literal `$type` of each registration (`$type: 'card'`, not `string`) without `as const`.

An existing `data as X` cast to a type unrelated to the schema output of a typed registry can now be a compile error; the cast was wrong before.
