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

## Explicit lifecycle

This works with plain custom elements, without decorators or a Radiant base class:

```ts
import { FormController } from '@schema-engine/forms-radiant/adapters/radiant';

class FormSummary extends HTMLElement {
	readonly form = new FormController(this);

	connectedCallback() {
		this.form.connect(() => {
			this.textContent = JSON.stringify(this.form.getValues());
		});
	}

	disconnectedCallback() {
		this.form.disconnect();
	}
}
customElements.define('form-summary', FormSummary);
```

`connect` waits for the instance to have a container, then calls the listener
once and after each change of the container's state. A new container replaces the
old one when the instance's config or engine changes; the controller follows it.
Reads and mutations require a container; use `form.ready` before reading during an
early render. `disconnect` removes the subscriptions.

## Optional decorator

```tsx
import { RadiantElement, customElement } from '@ecopages/radiant';
import { FormController, formController } from '@schema-engine/forms-radiant/adapters/radiant';

@customElement('form-summary')
class FormSummary extends RadiantElement {
	@formController form!: FormController;

	render() {
		return <output>{this.form.ready ? this.form.getValue('title') : ''}</output>;
	}
}
```

The decorator connects on mount, requests an update when the form changes, and
cleans up on disconnect. It supports TC39 standard field decorators and TypeScript
`experimentalDecorators`, the same dual dispatch as Radiant. The shipped
`se-field` host has no controller of its own; construct `new FormController(fieldElement)`
where you need one.

## Reads, selectors and mutations

- `container` is the engine container itself: `getSnapshot()`, `subscribe()`, `validate()`, `blur()`, `setErrors()` and the other commands of `FormStateContainer`.
- `getValues()` returns the container's nested values, the same object until a value changes; `getValue(path)` reads a dotted path.
- `setValue(path, value)` writes a branch, `reset(values?)` restores the defaults or replaces them, `trigger(paths?)` validates with the facts the controls have already reported to the container (typing, blur, a store write), not a fresh read of the controls: a submit and a wizard step read them, and an action's check reads them too.
- `field(path)` provides live `value` and `error` getters, `onChange`, and `onBlur`. `error` is the issue's text from the application's `formatIssue`, else its `message`.
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

Create the signals once, as fields, and read them inside an `effect` or a `computed`, which subscribe them. A signal is total: it reads `undefined` while the form has no container (a `rui-form` or an engine that arrives late) and on the server, and it follows the container the instance has now.

- `formState` is the container's snapshot: `values`, `errors` and `warnings` by path, `touched`, `dirty`, `rowIds`, `validating`, `isValid`.
- `fieldArray(path)` provides `fields`, `append`, `prepend`, `insert`, `swap`,
  `move`, `update`, `replace`, and `remove`. `append`, `prepend`, and `insert`
  accept one item or an array of items. `remove()` clears the array;
  `remove(index)` and `remove(indices)` remove selected rows. Call it again for the
  current `fields`: each object is a snapshot of the rows.

Row ids follow rows through insertion, reordering, and removal; `update` gives the
updated row a new id and `replace` gives every row one. Errors, touched, dirty and
native facts move with their rows in one update. Ids the container mints are
deterministic, so server-rendered rows and the client's agree without sending ids.

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

## Migration from the disconnected hooks

The old `useFormContext`, `useFormField`, `useWatchField`, `useWatchForm`,
`useFieldArray`, and `getActiveFormStore` exports are removed. Create a scoped
controller instead. Replace snapshot hook calls with `getValue` / `getValues`,
and use `select` when an actual subscription is needed. Apply
fallbacks at the read site (`form.getValue('title') ?? 'Untitled'`).

`FormProvider` supplies the Radiant form integration; it does not emulate React hooks.
`combineHandlers` composes a control callback with a caller callback. The unused
`bindControlledFormElement` export has been removed; use `form.field(name)` for
scoped programmatic field access.

`FormContextValue` is removed. `formState` is the engine's snapshot (`touched`, `dirty`,
`errors`, `isValid`); `submitCount` and `isSubmitting` are on `formInstanceContext`.
