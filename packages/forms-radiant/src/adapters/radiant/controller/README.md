# Radiant form controller

`FormController` reads the form instance's context from its host. Place the host
inside `se-form-instance` (the form a `FormRenderer` renders). The controller
asks `formInstanceContext` on the host, then on ancestors, until an instance
answers; it does not search descendants or use a global active form. The
instance owns one engine `FormStateContainer`, with nested values, and provides
it on that context, so a dotted path (`contacts.0.email`) names a value in every
read and write and nothing is translated. `FormFieldElement` extends
`RuiFieldElement`; Radiant UI registers controls and presents errors, and the
container validates. `SeFormArray` uses `container.fieldArray(path)` and the
container's row ids.

## Reads, commands and selectors

`FormController` has three members.

- `container` is the engine container itself, `undefined` until the instance has one. Every command and read goes through it: `getSnapshot()`, `getValue(path)`, `setValue(path, value)`, `blur(path)`, `validate(paths?)`, `checkValidity()`, `submit()`, `reset(values?)`, `fieldArray(path)`, `subscribe()`. A new container replaces the old one when the instance's config or engine changes, so read it from the controller on each use rather than keeping it.
- `select(selector)` returns a signal over a pure selector of the snapshot, built with `fromExternalStore`:

```ts
import { effect } from '@ecopages/signals';
import { selectFieldState } from '@schema-engine/forms/state-container';

class ContactCount extends HTMLElement {
	readonly form = new FormController(this);
	readonly count = this.form.select((snapshot) => snapshot.rowIds['contacts']?.length ?? 0);
	readonly invalid = this.form.select((snapshot) => selectFieldState(snapshot, 'contacts.0.email').invalid);

	private stop?: () => void;

	connectedCallback() {
		this.stop = effect(() => {
			this.textContent = `${this.count.get() ?? 0} contacts, first invalid: ${this.invalid.get() ?? false}`;
		});
	}

	disconnectedCallback() {
		this.stop?.();
	}
}
```

Create the signals once, as fields, and read them inside an `effect` or a `computed`, or `subscribe` to them. A signal is total: it reads `undefined` while the form has no container (a `rui-form` or an engine that arrives late) and on the server, and it follows the container the instance has now.

- `formatIssue(issue, path)` is the text the form shows for an issue: the renderer's `formatIssue`, else the engine's, else the issue's own `message`, else `undefined`.

```ts
const form = new FormController(host);
form.container?.setValue('title', 'Hello');
form.container?.fieldArray('contacts').append({ email: '' });
```

Row ids follow rows through insertion, reordering, and removal; `update` gives the
updated row a new id and `replace` gives every row one. Errors, touched, dirty and
native facts move with their rows in one update. Ids the container mints are
deterministic, and the server's snapshot carries them to the client.

## Engine access

`FormEngineController` resolves the `FormEngine` for a host, the way
`FormController` resolves the form store. Construct it with
`new FormEngineController(host)`.

- `engine` returns the engine from the host's `formEngineContext` (for example
  inside `se-form-renderer`), then the active render scope. It is cached until
  `disconnect`.
- `ready` is `true` once `engine` resolves.
- `connect(onChange?)` subscribes to `formEngineContext`, caches the engine the
  context supplies, and calls `onChange` each time the context publishes one,
  including a value already published when `connect` runs. A published value
  without an engine does not call it. The hosts of this package follow
  `formEngineContext` themselves with `@onContextUpdate`, so an engine the app
  binds to the renderer after they connect reaches them.
- `disconnect()` removes that subscription and clears the cached engine.

## Runtime boundary

The instance provides the container; `rui-form` is typed by Radiant UI's own
`FormStateStore` interface and is handed the container with `connect`, so a host
element reads state from the instance's context and never from `rui-form`'s.
`watchField`, `watchForm`, the flat/nested translation and `createChangeDetector`
are removed: select from the snapshot, or observe `values` for changes (the
container keeps the same `values` object until a value changes).

## Migration

The `connect` / `disconnect` lifecycle, the `@formController` decorator, `ready`, `formState`, `getValues`, `getValue`, `setValue`, `reset`, `trigger`, `field` and `fieldArray` are removed. Use `form.container` for commands and reads and `form.select` to follow state. `FormFieldValue` and `FieldArrayValue` are removed with them.
