---
'@schema-engine/registry': minor
---

`BaseRegistry` is replaced by `createMutableRegistry`, and both kinds of registry have one read interface. Build a registry that takes registrations at runtime with `createMutableRegistry<PluginRegistration>('Plugin')` instead of a `BaseRegistry` subclass. It returns a `MutableRegistry`: the read side of a `createRegistry` result (`get`, `has`, `all`, `keys`, `size`, `kind`) plus `register` and `clear`, so it goes wherever a registry is read: `safeParseNode`, `safeParseTree` and `exportTreeSchema` take either kind.

- `getAll()` is `all()` and `getAllKeys()` is `keys()`. Both return frozen arrays in first-registration order, the same array until the next `register` or `clear`, so copy one before sorting it.
- `registryName` is the `kind` argument, and `get` and `has` take a `string`. The `TKey` type parameter is gone: a registration's `$type` is its key.
- `register` checks a registration as `createRegistry` does and throws a `RegistryError` (`'invalid-schema'`, `'invalid-child-paths'`, `'duplicate-child-path'`, `'nested-child-path'`); the registry is unchanged when it throws. In the types, a child path the schema does not declare is a `childPathNotInSchema` error, as for `createRegistry`.
- A repeated `$type` replaces the earlier registration without a warning and keeps its position, or throws `'duplicate-type'` with `createMutableRegistry('Plugin', { duplicates: 'error' })`. The registry logs nothing: call `has` before `register` to warn about an override. `@ecopages/logger` is no longer a dependency of the package.
- `get` returns a frozen copy of the registration.
- The key is always `$type`. A subclass that overrode `getItemKey` or `getItemName`, or read the protected `items`, has no replacement, and one that added methods wraps the registry instead.

```ts
// before
class Plugins extends BaseRegistry<string, PluginRegistration> {
	get registryName() {
		return 'Plugin';
	}
}
const plugins = new Plugins();
plugins.getAll();
plugins.getAllKeys();
// after
const plugins = createMutableRegistry<PluginRegistration>('Plugin');
plugins.all();
plugins.keys();
```

`createRegistry` and `createMutableRegistry` take a `hint` option, exposed as the optional `hint` of a registry, so a registry is a `NodeLookup` with its hint: the sentence that ends the message of an unregistered `$type`, such as where to register it.

The lookup types are one set: `ReadOnlyRegistry`, `MutableRegistry`, `NodeLookup` (find one registration, what `safeParseNode` and `safeParseTree` take) and `ExportLookup` (list them all, what `exportTreeSchema` takes). A registry of either kind is all of them.
