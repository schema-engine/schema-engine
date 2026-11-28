---
'@schema-engine/registry': minor
---

`BaseRegistry` implements `ReadOnlyRegistry`, so both kinds of registry have one read interface: `get`, `has`, `all`, `keys`, `size` and `kind`. `getAll()` is `all()`, `getAllKeys()` is `keys()` and the abstract `registryName` is `kind`. `all()` and `keys()` return frozen arrays in first-registration order, as a `createRegistry` result does. `exportTreeSchema` takes a `BaseRegistry` directly, alone or in a list with a `createRegistry` result. The `TKey` type parameter is gone: a registration's `$type` is its key, and `get` and `has` take a `string`.

```ts
// before
class Plugins extends BaseRegistry<string, PluginRegistration> {
	get registryName() {
		return 'Plugin';
	}
}
plugins.getAll();
plugins.getAllKeys();
// after
class Plugins extends BaseRegistry<PluginRegistration> {
	readonly kind = 'Plugin';
}
plugins.all();
plugins.keys();
```
