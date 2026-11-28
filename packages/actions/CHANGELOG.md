# @schema-engine/actions

## 0.6.0

### Minor Changes

- [#446](https://github.com/schema-engine/schema-engine/pull/446) [`80e9cab`](https://github.com/schema-engine/schema-engine/commit/80e9cab742178fddd421b754a4f368b5ce4b7f26) Thanks [@andeeplus](https://github.com/andeeplus)! - Actions read a registry from `@schema-engine/registry`. `ActionRegistry` is removed: build the registry with `createRegistry('Action', [...])`, or `createMutableRegistry<MyAction>('Action')` for actions that register at runtime, both from `@schema-engine/registry` (add it to your dependencies).

    - `ActionRegistryProvider` and `ActionSchemaLookup` are removed. `parseActions` and `ActionDispatcher` take any lookup with `get($type)` (a `NodeLookup`): a registry of either kind, or `{ get }` over a store of your own. `getAction(type)` is `get(type)` and `getActionTypes()` is `keys()`. A `FormEngine` is no longer a lookup: pass `engine.actions`, which `@schema-engine/forms` now exposes.
    - The hint of an unregistered `$type` moves from `parseActions(registry, input, { hint })` to the lookup: `parseActions({ get, hint }, input)`. `ParseActionsOptions` keeps only `triggers`.
    - `ActionDispatcher` infers the context and trigger types from the registrations, which fix them through `defineAction<Context, Trigger>()`, so `new ActionDispatcher<Context, Trigger>(registry)` is `new ActionDispatcher(registry)`. A `dispatch` with another context or trigger is still a type error.
    - An action registered inline must be wrapped in `defineAction<Context, Trigger>()(...)`. In 0.5, `new ActionRegistry<Context, Trigger>([{ $type, schema, metadata, execute: (ctx) => ... }])` typed the inline registration from the class parameters. `createRegistry('Action', [{ ... }])` has no such parameters, so an inline `execute` does not compile: write `createRegistry('Action', [defineAction<Context, Trigger>()({ ... })])`, or `defineAction<Context, Trigger>()` once and call it for each action.
    - A registry that holds actions of several configs, such as a mutable one, is typed `AnyActionRegistration<Context, Trigger>`, which the package now exports: `createMutableRegistry<AnyActionRegistration<Context, Trigger>>('Action')`.
    - The log for an action with no registration names the action `id` and the registry's `kind`, and no longer lists the registered types.

    ```ts
    // before
    import { ActionDispatcher, ActionRegistry, parseActions } from '@schema-engine/actions';

    const registry = new ActionRegistry<Context, Trigger>([
    	{ $type: 'log', schema, metadata, execute: (ctx) => ({ success: true }) },
    	notify,
    ]);
    const parsed = parseActions(registry, input, { hint: 'Register it in plugins.ts.' });
    const dispatcher = new ActionDispatcher<Context, Trigger>(registry);

    class Store implements ActionRegistryProvider<Context, Trigger> {
    	getAction(type: string) {
    		/* ... */
    	}
    	getActionTypes() {
    		/* ... */
    	}
    }
    // after
    import { createRegistry } from '@schema-engine/registry';
    import { ActionDispatcher, defineAction, parseActions } from '@schema-engine/actions';

    const defineLog = defineAction<Context, Trigger>();
    const registry = createRegistry('Action', [
    	defineLog({ $type: 'log', schema, metadata, execute: (ctx) => ({ success: true }) }),
    	notify,
    ]);
    const parsed = parseActions(registry, input);
    const dispatcher = new ActionDispatcher(registry);

    // A store of your own, with a domain hint
    parseActions({ get: (type) => store.find(type), hint: 'Register it in plugins.ts.' }, input);
    ```

- [#442](https://github.com/schema-engine/schema-engine/pull/442) [`56381d9`](https://github.com/schema-engine/schema-engine/commit/56381d9d82a9b50a6ac5d9723354a82984de8609) Thanks [@andeeplus](https://github.com/andeeplus)! - The issues the registry creates reach the callers of `parseActions` and `validateForm` with their namespaced `code`. An unregistered `$type`, a node that is not an object and a node without a `$type` have the code `registry/unregistered-type`, `registry/not-an-object` and `registry/missing-type`. `ParseActionsResult` types its issues as the registry's `RegistryIssue`, and a form issue from the registry has `code` and `params` (`{ received }` for an unregistered `$type`), so an editor can localize it like a schema issue. Messages and paths are unchanged, and an issue the actions or forms engine finds itself still has no code.

### Patch Changes

- [#455](https://github.com/schema-engine/schema-engine/pull/455) [`b3302bf`](https://github.com/schema-engine/schema-engine/commit/b3302bff07ae32a812aae17b1ffa4a67a81ed077) Thanks [@andeeplus](https://github.com/andeeplus)! - The published packages resolve under `node16` and `nodenext` module resolution, and declare what they are.

    - The declaration files write their relative imports with an extension (`./types.js`), so a consumer on `node16` or `nodenext` finds the exports of `@schema-engine/actions`, `forms`, `forms-react`, `layout` and `forms-radiant`, where the entry resolved to no exports. `@schema-engine/forms-radiant` no longer writes `export * from './recipes/index.d.ts'`, which was an error (TS2846) for a project with `skipLibCheck: false`.
    - `@schema-engine/actions` has an `exports` map (`.` and `./package.json`), as the other packages do, and `@schema-engine/registry` exports `./package.json`.
    - No package declares an `engines` field.
    - `@schema-engine/forms-radiant` no longer lists `@schema-engine/actions` as a dependency, which nothing imported.

- Updated dependencies [[`b3302bf`](https://github.com/schema-engine/schema-engine/commit/b3302bff07ae32a812aae17b1ffa4a67a81ed077), [`2ddce15`](https://github.com/schema-engine/schema-engine/commit/2ddce1566bd4a1812557ddbf65c1af693da5e28f), [`479f41b`](https://github.com/schema-engine/schema-engine/commit/479f41b3891666cf8da2c949b71b2e8295aca59f), [`5addcce`](https://github.com/schema-engine/schema-engine/commit/5addcceecabfc0d94580435217ce13fc566a3410), [`612d332`](https://github.com/schema-engine/schema-engine/commit/612d33213af7d9a1d2a71ebf7ccddf8279c492c7), [`8608803`](https://github.com/schema-engine/schema-engine/commit/860880328679a5226b96d2cdb03064f9a9403ed3), [`0930f0a`](https://github.com/schema-engine/schema-engine/commit/0930f0a8cab9d4e6e8d78bb36e92c32f01a6ed25), [`b75f9bb`](https://github.com/schema-engine/schema-engine/commit/b75f9bb5b6e158a846773c394660450e00fa26ca), [`80e9cab`](https://github.com/schema-engine/schema-engine/commit/80e9cab742178fddd421b754a4f368b5ce4b7f26), [`7e86306`](https://github.com/schema-engine/schema-engine/commit/7e86306754c0e1689205c33cafba9fdc07d37aff), [`42a3f6f`](https://github.com/schema-engine/schema-engine/commit/42a3f6fcd76339ad4641d77208095714be63fe36), [`56381d9`](https://github.com/schema-engine/schema-engine/commit/56381d9d82a9b50a6ac5d9723354a82984de8609)]:
    - @schema-engine/registry@0.6.0

## 0.5.2

### Patch Changes

- [#415](https://github.com/schema-engine/schema-engine/pull/415) [`02f21c9`](https://github.com/schema-engine/schema-engine/commit/02f21c9ddc51e0b1d7712854707580f5b4e895d0) Thanks [@andeeplus](https://github.com/andeeplus)! - `parseActions` checks each entry with `safeParseNode` from `@schema-engine/registry`, so a workflow entry reports the same issues, at the same places, as any other node:

    - An unregistered `$type` is `No registration for $type '<type>'. Register it in the action registry.` at `$type` (it was `Unknown action type '<type>'. Register it in the action registry.`).
    - An entry that is an object without a string `$type` is `Expected a string $type.` at `$type` (it was `Invalid action configuration: missing $type.`).
    - An entry that is not an object, such as `null` or a string, is `Expected an object with a string $type.` at the entry itself, for example `[1]` (it was at `[1, '$type']`).

    `parseActions` takes `options.hint`, a string that replaces `Register it in the action registry.` at the end of that message, for a domain that registers actions through its own entry point.

    The other issues, their paths and the parsed result are unchanged.

- Updated dependencies [[`67e2556`](https://github.com/schema-engine/schema-engine/commit/67e25562959cc0242a56a59ec8d982f6e21fc93b), [`bdff897`](https://github.com/schema-engine/schema-engine/commit/bdff897952056ea0a4033e014692f5afc78c96d0), [`40a3d6f`](https://github.com/schema-engine/schema-engine/commit/40a3d6f8f111ebcd00cad0e72d056d5aa3710488), [`a719ba4`](https://github.com/schema-engine/schema-engine/commit/a719ba4e773cd3223bb7e4e6723e82a1006d1874), [`e1813af`](https://github.com/schema-engine/schema-engine/commit/e1813af3efa2c20e93f3a790651dc29a5115d2d0), [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75)]:
    - @schema-engine/registry@0.5.2

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.
- Updated dependencies [[`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39)]:
    - @schema-engine/registry@0.5.1
