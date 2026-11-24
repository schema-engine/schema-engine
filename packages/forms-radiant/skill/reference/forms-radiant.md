# @schema-engine/forms-radiant

The Radiant renderer. Widgets and recipes ship in the package (no copy step), and the elements are Radiant UI custom elements.

## Setup

Install the peers (`@schema-engine/forms`, `@schema-engine/layout`, `@ecopages/radiant-ui`, `@ecopages/radiant`, `@ecopages/jsx`, `@ecopages/signals`, `zod`) and import one Radiant UI theme, its stylesheet and the package's once in the global stylesheet: `@ecopages/radiant-ui/themes/default`, `@ecopages/radiant-ui/styles.css` and `@schema-engine/forms-radiant/index.css`. `createRadiantFormEngine` is `createFormEngine` with the Radiant recipes bound, and the packaged widgets are `schemaFormRegistrations`.

```ts title="radiant/app-engine.ts"
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';

export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
```

`FormRenderer({ engine, config, onSubmit })` renders the form, and the same config as React works. Its other props are `onChange`, `onAction`, `onActionResults(results, trigger)` (as in React; the same results reach the bubbling `se-action-results` event), `navigate(url)` (where a submit action's `redirectUrl` takes the page, `location.assign` by default) and `formatIssue`. Rendered on the server, the engine is not serialized into the markup, so the app assigns it to each `se-form-renderer`, before or after the renderer upgrades, and the hosts below follow it when it arrives or changes. A client-side router that swaps in a parsed page does not upgrade it first: bind in the router's `eco:before-swap` event, on `event.detail.newDocument`.

```ts title="radiant/bind-engine.ts"
import type { FormRendererElement } from '@schema-engine/forms-radiant';
import { engine } from './app-engine';

export function bindEngine(root: ParentNode): void {
	for (const renderer of root.querySelectorAll<FormRendererElement>('se-form-renderer')) {
		renderer.engine = engine;
	}
}
```

A test of the binding builds the element and checks the renderer holds the engine:

```ts title="radiant/bind-engine.browser.suite.ts"
import { expect, test } from 'vitest';
import { engine } from './app-engine';
import { bindEngine } from './bind-engine';

test('the packaged engine registers the default widgets, and an app binds it to every renderer', () => {
	expect(engine.getElement('input')?.$type).toBe('input');

	const renderer = document.createElement('se-form-renderer');
	document.body.append(renderer);
	bindEngine(document);

	expect((renderer as unknown as { engine: unknown }).engine).toBe(engine);
});
```

Save your copy as `bind-engine.browser.test.ts`; the `.suite` name only keeps this mirrored example out of this repository's own test runs.

## What the elements do

- `se-form-instance` creates the form's runtime and container from the normalized config, the engine and the defaults, mounts the runtime on connect and unmounts it on disconnect. A new config, engine or `defaultValues` is a new container; moving the instance keeps it. It keeps only what an element can do: focus, syncing the controls, the native submit with its CSRF field and the `se-action-*` events.
- `rui-form` is the control bridge. The instance hands it the container with `connect`; it sends each control's value and native validity into the container through `setValue`, `blur` and `reportNative`, presents the container's errors and warnings, and owns the submit event and `FormData`. Controls inside a `rui-field` dispatch native `input` and `change` events, which the bridge reads.
- `se-field` (`FormField`) is the field host: it follows the container's `disabled` and `required` for its path.

There is no global active form and no hooks: an element reads the form it belongs to with a `FormController`.

## FormController

`new FormController(host)` resolves the nearest `se-form-instance` around a host element on each use, so it is safe across a config change. `container` is the form's `FormStateContainer`, `undefined` until the instance has one; every command and read goes through it. `select(selector)` returns a signal over a pure selector of the snapshot, and `formatIssue(issue, { path })` is the text the form shows for an issue.

```ts title="radiant/controller.ts"
import { FormController } from '@schema-engine/forms-radiant';

export function containerOf(host: HTMLElement) {
	return new FormController(host).container;
}
```

Create a signal once, as a field, and read it inside an `effect`; it reads `undefined` while the form has no container. `FormEngineController` does the same for the nearest renderer's engine (`engine`, `ready`, `connect`, `disconnect`).

`controller.watchRuntime(callback)` calls back with the runtime of the form the element sits in, now and each time the form replaces it, for `registerFormAgentTool` (`forms.md`).

Writing a widget or a custom control host is in `forms-radiant-widgets.md`.
