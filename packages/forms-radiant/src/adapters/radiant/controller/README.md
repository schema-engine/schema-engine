# Radiant form controller

`FormController` reads Radiant UI's `formContext` from its host. Place the host
inside `rui-form`, or pass `rui-form` itself. The controller asks `formContext`
on the host, then on ancestors, until a store answers. It does not search
descendants or use a global active form. `FormFieldElement` extends
`RuiFieldElement`; Radiant UI continues to register controls and own validation,
error presentation, and ARIA. `SeFormArray` uses the same controller for row edits.

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

Place the consumer inside `rui-form`. `connect` waits for the ancestor form's
context to become ready and then notifies on presentation changes. Reads and
mutations require a ready form; use `form.ready` before reading during an early
render. `connect` replaces only the context subscription, so a watch created
before it (or before a second `connect`) keeps running. `disconnect` removes
context subscriptions and all watches created by that controller. A watch
stays on the store it subscribed to, so after moving a host to another form call
`disconnect`, then `connect`, then watch again.

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
cleans up on disconnect. It uses the same controller as the explicit lifecycle.
It supports TC39 standard field decorators and TypeScript
`experimentalDecorators`, the same dual dispatch as Radiant. The shipped
`se-field` host has no controller of its own, so a field is not updated on
every store notification; construct `new FormController(fieldElement)` where you
need one.

## Reads, watches, and mutations

- `getValues()` returns a nested snapshot; `getValue(name)` reads a dotted path.
- `setValue(name, value)` writes the value and updates registered controls.
- `field(name)` provides live `value` and `error` getters, `onChange`, and `onBlur`.
- `watchField(name, listener)` and `watchForm(listener)` call the listener
  immediately and on every store notification, including touched, error and submit-state
  updates that leave the values as they were. Both return an unsubscribe function. A consumer
  of value changes compares snapshots with `createChangeDetector` (`values.ts`).
- `formState` exposes Radiant UI state with nested values. `trigger(names?)`
  validates registered fields; `reset(values?)` resets the Radiant UI store.
- `fieldArray(name)` provides `fields`, `append`, `prepend`, `insert`, `swap`,
  `move`, `update`, `replace`, and `remove`. `append`, `prepend`, and `insert`
  accept one item or an array of items. `remove()` clears the array;
  `remove(index)` and `remove(indices)` remove selected rows.

IDs follow rows through insertion, reordering, and removal. `update` creates a
new ID for the updated row, and `replace` creates new IDs for all rows. Array
operations reindex errors, touched flags, and dirty flags alongside values.
Invalid insertion, update, swap, and move indices are ignored.

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

Radiant UI publishes the live store on `formContext`. `FormController` reads
that context from the host and is the get/update API for Schema Engine consumers.
Use `getValue` / `setValue` /
`reset` / `watchForm`; `form.store` is the Radiant UI store when a method is
not wrapped yet.

Radiant UI uses flat field names. `values.ts` expands them for reads and submission
and flattens defaults for registration. `write-value.ts` replaces a value branch
and updates its registered controls before notifying controller subscribers.
Use controller methods for programmatic branch replacement so stale descendant
values are removed. Raw Radiant UI store subscribers still follow Radiant UI's
per-control notification behavior.

## Migration from the disconnected hooks

The old `useFormContext`, `useFormField`, `useWatchField`, `useWatchForm`,
`useFieldArray`, and `getActiveFormStore` exports are removed. Create a scoped
controller instead. Replace snapshot hook calls with `getValue` / `getValues`,
and use `watchField` / `watchForm` when an actual subscription is needed. Apply
fallbacks at the read site (`form.getValue('title') ?? 'Untitled'`).

`FormProvider` supplies the Radiant form integration; it does not emulate React hooks.
`combineHandlers` composes a control callback with a caller callback. The unused
`bindControlledFormElement` export has been removed; use `form.field(name)` for
scoped programmatic field access.

`FormContextValue` is removed. `formState` uses Radiant UI's state contract
(`touched`, `dirty`, and `isSubmitted`); it does not synthesize the former
`touchedFields` or `submitCount` properties. Required and disabled presentation
remain on field configuration and `RuiFieldElement`, rather than on the
controller's value binding.
