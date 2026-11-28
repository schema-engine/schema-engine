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

```ts title="radiant/bind-engine.browser.test.ts"
import { expect, test } from 'vitest';
import { engine } from './app-engine';
import { bindEngine } from './bind-engine';

test('the packaged engine registers the default widgets, and an app binds it to every renderer', () => {
	expect(engine.elements.get('input')?.$type).toBe('input');

	const renderer = document.createElement('se-form-renderer');
	document.body.append(renderer);
	bindEngine(document);

	expect((renderer as unknown as { engine: unknown }).engine).toBe(engine);
});
```

Save your copy as `bind-engine.browser.test.ts`.

## What the elements do

- `se-form-instance` creates the form's runtime and container from the normalized config, the engine and the defaults, mounts the runtime on connect and unmounts it on disconnect. A new config, engine or `defaultValues` is a new container; moving the instance keeps it. It keeps only what an element can do: focus, syncing the controls, the native submit with its CSRF field and the `se-action-*` events.
- `rui-form` is the control bridge. The instance hands it the container with `connect`; it sends each control's value and native validity into the container through `setValue`, `blur` and `reportNative`, presents the container's errors and warnings, and owns the submit event and `FormData`. Controls inside a `rui-field` dispatch native `input` and `change` events, which the bridge reads.
- `se-field` (`FormField`) is the field host: it follows the container's `disabled` and `required` for its path.

There is no global active form and no hooks: an element reads the form it belongs to with a `FormController`.

## FormController

`new FormController(host)` resolves the nearest `se-form-instance` around a host element on each use, so it is safe across a config change. `container` is the form's `FormStateContainer`, `undefined` until the instance has one; every command and read goes through it. `select(selector)` returns a signal over a pure selector of the snapshot, `formatIssue(issue, { path })` is the text the form shows for an issue, `wizard` is a signal over the wizard (`current`, `steps`, `navigating`, `next()`, `back()`, `goTo(id)`), `submission` a signal over the submission, and `clearSubmission()` hides the outcome of the last submission. Both signals read `undefined` while the form has no runtime.

```ts title="radiant/controller.ts"
import { FormController } from '@schema-engine/forms-radiant';

export function containerOf(host: HTMLElement) {
	return new FormController(host).container;
}
```

Create a signal once, as a field, and read it inside an `effect` or `subscribe` to it; `select` reads `undefined` while the form has no container. `FormEngineController` does the same for the nearest renderer's engine (`engine`, `ready`, `connect`, `disconnect`).

`controller.watchRuntime(callback)` calls back with the runtime of the form the element sits in, now and each time the form replaces it, for `registerFormAgentTool` (`forms.md`).

Writing a widget or a custom control host is in `forms-radiant-widgets.md`.

## Exports by entry

- `@schema-engine/forms-radiant`: `createRadiantFormEngine`, `FormRenderer`, the views and the recipes.
    - `FormInstance` is the view of one form inside `FormRenderer`, which is the one an app uses. `FormElements` renders a list of normalized elements, as a container widget does for its children, and `RecipeRenderer` renders every step's fields once inside a recipe's chrome and hides the steps that are not shown.
    - `FormDebugger` (and the `FormDebuggerElement` behind it) is an opt-in inspector of a form's values, errors and steps, for development.
    - `radiantRecipes` is the list `createRadiantFormEngine` registers: `CardRecipe`, `SplitScreenRecipe`, `HeroBackgroundRecipe`, `BareControlsRecipe`, `WizardRecipe`, `SidebarWizardRecipe`, `CardWizardRecipe`, `HeroWizardRecipe` and `SplitScreenWizardRecipe`. `defineRecipe(spec, { shell?, slots })` binds your own shell and slot factories to a spec from `defineRecipeSpec` (`@schema-engine/forms/recipes`), requiring exactly the slots the spec declares. The default wizard recipe is `DEFAULT_WIZARD_RECIPE` of `@schema-engine/forms` (`forms.md`).
    - `schemaFormRegistrations` lists every element registration, in registration order, for `createRadiantFormEngine({ elements })`.
    - `createRadiantPhoneValidationRegistration()` takes no arguments and builds the `phone` rule registration, the default rule of `phone-input`. Its check loads `libphonenumber-js` the first time it runs and accepts an empty value or a valid phone number in international format (`+` and the country code). `PhoneInputElementRegistration` already carries it, so call it only to add the rule to an engine that registers `phone-input` some other way.
- `@schema-engine/forms-radiant/registrations`: one registration per default element contract, bound to its Radiant component: `InputElementRegistration`, `TextareaElementRegistration`, `NumberElementRegistration`, `SelectElementRegistration`, `CheckboxElementRegistration`, `CheckboxGroupElementRegistration`, `SwitchElementRegistration`, `RadioElementRegistration`, `SliderElementRegistration`, `ComboboxElementRegistration`, `DropZoneElementRegistration`, `FieldSetRegistration`, `InputOTPElementRegistration`, `PhoneInputElementRegistration`, `MaskedInputElementRegistration`, `ArrayElementRegistration`, `SubmitButtonElementRegistration` and `SubmissionAlertElementRegistration`. `radiantElements` is the registry of all of them, built with `bindRegistry`.
- `@schema-engine/forms-radiant/primitives`: `FormField` and `FormFieldElement` (the `se-field` host), `FormElement` (one element) and `ChildGrid`, the grid of a container's children: `elements` for tracks of its own, or `subgrid: true` for the tracks of the grid around the container, never both.
- `@schema-engine/forms-radiant/hooks`: `combineHandlers(controllerHandler, propsHandler?)` returns a handler that calls the controller's, then the one the config passed. `mergeFieldGridHost(grid?, style?, themeId?)` returns a field host's placement `style` and the `themeId` to set as `data-se-theme`: the one given, else the rendering engine's, else the default theme's.
- `@schema-engine/forms-radiant/contexts`: `formInstanceContext` (the wizard, `isWizard`, `meta`, `submission`, `runtime` and `formatIssue`) and `formEngineContext` (the renderer's `engine` and `formatIssue`), which the hosts publish to the blocks and recipes of a renderer. An app reads the form with a controller instead.
