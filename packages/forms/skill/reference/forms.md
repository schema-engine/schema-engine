# @schema-engine/forms

The engine, the config, validation timing, constraints, the container and, for renderer authors, the runtime. The terms are defined in the router (`SKILL.md`).

## Engine

`createFormEngine` takes `elements`, `recipes`, `actions`, `validations` (extra rules), `catalog` (extra metadata entries for the JSON Schema export), `layout`, `formatIssue`, `fetch`, `csrf` and `defaultWizardRecipe`. It builds read-only registries (a later `$type` replaces an earlier one) and returns an immutable engine: create it once and reuse it. `engine.extend({ elements, recipes, actions, validations, catalog })` adds registrations and inherits the layout theme, the formatter, `fetch`, `csrf` and the default wizard recipe. `FormEngine` is the class it returns. An app gives the engine and a config to a renderer: `FormRenderer` in `forms-react.md` or `forms-radiant.md`. The package ships no field widgets, only the contracts of the 18 default elements in `@schema-engine/forms/default-elements` (`defaultElementContracts`, and per element a schema such as `CheckboxFieldConfigSchema`, its types, its value declaration and `CheckboxElementContract`: a registration without `render`); a renderer binds `render` to a contract, and an element of your own is registered with `defineInput({ $type, schema, metadata, value, render })` (see Registrations below), and renderer packages bring the widgets.

```ts title="forms/engine.ts"
import * as z from 'zod/mini';
import { createFormEngine, defineInput, BaseFieldSchema } from '@schema-engine/forms';

export const textRegistration = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: () => null,
});

export const engine = createFormEngine({ elements: [textRegistration] });
```

## Registrations

You register with `createFormEngine({ elements, recipes, actions, validations })`: the engine builds one read-only registry of each from the lists, on `@schema-engine/registry`.

```ts title="forms/registry.ts"
import { createFormEngine } from '@schema-engine/forms';
import { postalCode } from './custom-rule';
import { textRegistration } from './engine';

export const appEngine = createFormEngine({ elements: [textRegistration], validations: [postalCode] });

export const elementTypes = appEngine.getAllElements().map(({ $type }) => $type);

export const ruleTypes = appEngine.getValidationRegistry().keys();
```

Registrations are stored by `$type`, and a later one replaces an earlier one with no warning, so a list ending in your own replaces a built-in. A schema that is not a Standard Schema (no `~standard.validate`) throws at build, naming the kind and the `$type`. The registries are read-only and frozen, and the objects you passed are left untouched, so there is no `register` or `clear` after the build. A registry of your own, outside a form engine, is in `registry.md`.

Every registration is `{ $type, schema, metadata }` (an element also has a `kind`, `'input'` or `'static'`, which `defineInput` and `defineStatic` set and a registration written by hand must state): `$type` is the stable key, `schema` is any Standard Schema (Zod, Zod Mini, Valibot, Effect Schema or a hand-written one) that describes the config, and `metadata` has a `name` and optionally a `description`, `icon`, `tags` and `version`. A renderable one adds `render`; an action adds `execute`; a validation rule adds `category` and `handler`.

The engine builds four registries from `createFormEngine`: `elements` (`defineInput` for a field, `defineStatic` for display-only content), `recipes`, `actions` and `validations`. `elements` and `recipes` are for the renderer, `actions` for the runtime and `validations` for the container. Authors supply the schema's input and renderers receive its output, so register elements with `defineInput` (which also takes the `value` the control writes) and `defineStatic`, which keep the two apart.

The engine lists what it holds with `getAllElements()`, `getAllRecipes()` and `getAllActions()`, looks one up with `getElement($type)`, `getRecipe($type)` and `getAction($type)`, and exposes its rules as `getValidationRegistry()`, itself a read-only registry. `engine.generateFormConfigSchema()` exports a JSON Schema of the form config for editors, agents and other tools. The export reads the schema of every registration (element, action, rule and recipe slot) the same way: a Zod schema (classic or Mini) through the Zod converter, any other schema that sets `~standard.jsonSchema` as what its `input()` or `output()` returns (ArkType does; Valibot and Effect Schema do not without an adapter), and any other schema as an open object listed by its `$type` or, for a recipe slot, its appearance axes. A hand-written schema exports exactly when it adds `~standard.jsonSchema`. The export drops that schema's `$schema`, moves a recursive one (a root `$ref` with `$defs`) to where its references resolve, and lists it by its shape when its converter throws for the target (ArkType for `openapi-3.0`). The engine never changes after it is built: `engine.extend({ ... })` returns a new one.

### Registering a widget

A widget is a registration, `defineInput({ $type, schema, metadata, value, render })`, and the schema is the widget's config: `z.extend(BaseFieldSchema, { $type: z.literal('...'), ...yours })`. `defineInput` keeps the schema's input and output apart, so authors write the input and `render` receives the output with defaults applied. `value` declares what the control writes, as a function of the configured element that returns a Standard Schema (a rating's `max` is its bound; a select's options are an enum): `defineInput` requires it, the engine checks every submission against it, and the type of `onSubmit` comes from it. The control writes exactly what it declares (a number option is a number, not its text), and a control that writes something else fails the submission with a `valueMismatch` issue at its path. A container widget declares `elements: elementChildrenSchema`, no `value` (its value is its children's), and renders its children with `FormElements`, which composes the paths at render time. A display-only element uses `defineStatic` and declares none. Writing the `render` function is in `forms-react-widgets.md` and `forms-radiant-widgets.md`.

## Config

Authors supply schema input, so defaults stay optional; renderers receive schema output. `defineForm` and `validateForm` run one pipeline and throw a `FormValidationError` on an invalid form; `engine.safeValidateForm(json)` returns `{ success, data | issues }` with the config `path` of each issue; `formatIssuePath(path)` from `@schema-engine/registry` writes a path as `steps[0].elements[2].name`. An issue a schema reported has a `code` and `params` (`too_small` with `{ minimum: 3 }`), and so does one the registry creates, with a namespaced code (`registry/unregistered-type` with `params.received`, `registry/not-accepted` with `expected` and `received`, `registry/not-an-object`, `registry/missing-type`), so an editor can localize either; an issue the engine finds itself has neither. A step needs an `id` and a `title`.

```ts title="forms/contact-form.ts"
import { engine } from './engine';

export const contactForm = engine.defineForm({
	id: 'contact',
	validationMode: 'onBlur',
	steps: [
		{
			id: 'details',
			title: 'Details',
			elements: [
				{
					$type: 'text',
					name: 'name',
					rules: [{ $type: 'required', id: 'name-required', message: 'Name is required' }],
				},
				{
					$type: 'text',
					name: 'email',
					rules: [{ $type: 'required' }, { $type: 'email', message: 'Not an email' }],
				},
				{
					$type: 'text',
					name: 'nickname',
					rules: [{ $type: 'minLength', value: 3, severity: 'warning', id: 'nickname-short' }],
				},
				{
					$type: 'text',
					name: 'company',
					constraints: [{ field: 'email', operator: 'contains', value: '@example.com', $type: 'hide' }],
				},
			],
		},
	],
});
```

Form-level keys: `view` (a registered recipe, optional for a one-step form), `validationMode`, `reValidateMode`, `navigation` (`linear` or `free`), `payload`, `actions`, `grid` and `appearance`. A multi-step form with no `view` gets the engine's default wizard recipe, `defaultWizardRecipe`. Set, it must name a registered `wizard` recipe or the engine build throws; unset, it is `bare-controls` (`DEFAULT_WIZARD_RECIPE`) when that recipe is registered, and otherwise the form keeps no `view` and `validateForm` warns.

## Validation timing

`validationMode` says when a field validates before a check of it has failed: `onSubmit` (default), `onChange`, `onBlur`, `onTouched` (the first blur, then every change) or `all`. `reValidateMode` (`onChange` default, `onBlur`, `onSubmit`) says when it validates once a check of it has failed. Writing the rules is in `forms-validation.md`.

## Constraints

A constraint is `{ field, operator, value, $type }` on an element, where `field` names a sibling (resolved from where the element is rendered, so inside `contacts.0.email` it means `contacts.0.<field>`).

- `operator`: `equals`, `not_equals`, `contains`, `not_contains`, `greater_than`, `less_than`, `is_empty`, `is_not_empty`.
- `$type`: `show`, `hide`, `enable`, `disable`, `require`.

A hidden or disabled field, and every field of a skipped step, takes no part: it is never validated and is left out of the submitted values. A step takes `show` and `hide` constraints on fields of earlier steps. A renderer never evaluates constraints itself: it reads them from the container (`selectFieldState(snapshot, path)` gives `hidden`, `disabled` and `required`).

## Container

`createFormStateContainer({ config, registry, defaults?, snapshot? })` builds the state of a form with no framework. `config` is the normalized form and `registry` is `engine.getValidationRegistry()`. The runtime and both renderers build theirs for you; build one directly for a server check, a script or a renderer of your own.

```ts title="forms/container.ts"
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { contactForm } from './contact-form';
import { engine } from './engine';

export function createContactContainer() {
	return createFormStateContainer({ config: contactForm, registry: engine.getValidationRegistry() });
}

export async function submitContact(name: string, email: string) {
	const container = createContactContainer();
	container.setValue('name', name);
	container.setValue('email', email);

	const result = await container.submit();
	if (result.outcome === 'passed') {
		result.setServerErrors({ email: { type: 'taken' } });
	}
	return { container, result };
}
```

- `validate(paths?)` records the findings and resolves `{ outcome: 'passed' | 'invalid' | 'overtaken' }`. An empty list validates nothing and omitting it validates the form. A check outrun by an edit runs once more over the same rows; only a second outrun, a removed row or a reset is `overtaken`. It rejects with a `FormValidationFailure` when a rule could not run.
- `checkValidity()` is a boolean for the state at the call. It writes nothing and is never overtaken.
- `submit()` resolves `{ outcome: 'passed', values, setServerErrors }`, `{ outcome: 'invalid' }` or `{ outcome: 'overtaken' }`. The values are frozen, exclude fields that took no part and carry the config's `payload`.
- `reportNative(facts)` takes what a platform control says about its value; renderers call it, not application code.
- `reset(values?)` restores the defaults, or replaces them first, and clears every error, mark and fact.
- `getSnapshot()` is stable until something changes. Read it with `selectValue` and `selectFieldState` (its `error` is the one of exactly that path), which return the same object while what they read is unchanged, so they are safe for `useSyncExternalStore`.
- `toHydration(container.getServerSnapshot())` is the serializable part a server hands to a client, which passes it as `snapshot` so row ids survive.

## Runtime (for renderer authors)

An app does not create a runtime: a renderer creates one for each form it draws, and an app reaches it with a hook or a controller (`useFormRuntime`, `FormController`). `createFormRuntime({ engine, config, host, onSubmit, ... })` wraps a container with the submission, the wizard and the actions. `host.focus(paths)` is the only required host member; a renderer adds `sync` and `submitNatively` when it needs them.

```ts title="forms/runtime.ts"
import { createFormRuntime, type FormValues } from '@schema-engine/forms';
import { notifyEngine, notifyForm } from './notify-action';

export function createNotifyRuntime(onSubmit: (values: FormValues) => void) {
	const runtime = createFormRuntime({
		engine: notifyEngine,
		config: notifyForm,
		host: { focus: () => {} },
		onSubmit,
	});
	const unmount = runtime.mount();
	return { runtime, unmount };
}
```

Every command resolves one string: `moved`, `submitted`, `failed`, `invalid`, `overtaken`, `refused`, `busy` or `cancelled`. One lock covers navigation and submission, so a command made while another runs is `busy`, and a reset or `unmount` revokes the one in flight (`cancelled`); a submission whose values were already captured is committed and still completes. `runtime.getSnapshot()` is `{ submission, current, navigating, steps }`, each step with `id`, `title`, `skipped`, `visited`, `complete`, `invalid` and `reachable` (`goTo` can move there); `runtime.container` is the state. Submitting is in `forms-submission.md`. The docs page is `/docs/renderer-authors/runtime`.

## Testing a container

A container of your own, or a store that must behave like this one, proves it with the conformance suite. It depends on no test runner: pass the `describe` and `test` of yours (Vitest below; Jest, Bun and `node:test` work the same), and import this entry only from a test file.

```ts title="forms/container-conformance.test.ts"
import { describe, test } from 'vitest';
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { formStateContainerConformance } from '@schema-engine/forms/testing';

formStateContainerConformance(createFormStateContainer, { describe, test });
```

Save your copy as `container-conformance.test.ts`.

## Agent tool (experimental)

`registerFormAgentTool(runtime, { name, description })` from `@schema-engine/forms/agent-tool` offers a rendered form to a browser agent as a WebMCP tool: the tool's input is the runtime's `submissionSchema`, and calling it fills the form and, with `autoSubmit: true`, submits it. It returns the function that unregisters the tool. WebMCP is an origin trial and the API may change, so nothing else in the package imports it.

## Default element contracts

`@schema-engine/forms/default-elements` holds one contract for each of the 18 default elements. A contract is a registration without `render` and `validations` (`InputContract` for an input, `StaticContract` for a display-only element), so every renderer agrees on an element's schema and on the value its control writes. For each element the entry exports its config schema (with the type inferred from it), the schema of its own keys, a `...FieldValue` declaration of what the control writes and the contract.

| `$type`            | Config schema                                                 | Own-keys schema                     | Value declaration         | Contract                         |
| ------------------ | ------------------------------------------------------------- | ----------------------------------- | ------------------------- | -------------------------------- |
| `input`            | `InputFieldSchema`                                            | `InputFieldExtensionSchema`         | `inputFieldValue`         | `InputElementContract`           |
| `textarea`         | `TextareaFieldSchema`                                         | `TextareaFieldExtensionSchema`      | `textareaFieldValue`      | `TextareaElementContract`        |
| `number`           | `NumberFieldConfigSchema`                                     | `NumberFieldExtensionSchema`        | `numberFieldValue`        | `NumberElementContract`          |
| `select`           | `SelectFieldConfigSchema`, `SelectOptionSchema`               | `SelectFieldExtensionSchema`        | `selectFieldValue`        | `SelectElementContract`          |
| `checkbox`         | `CheckboxFieldConfigSchema`                                   | `CheckboxFieldExtensionSchema`      | `checkboxFieldValue`      | `CheckboxElementContract`        |
| `checkbox-group`   | `CheckboxGroupFieldConfigSchema`, `CheckboxGroupOptionSchema` | `CheckboxGroupFieldExtensionSchema` | `checkboxGroupFieldValue` | `CheckboxGroupElementContract`   |
| `switch`           | `SwitchFieldConfigSchema`                                     | `SwitchFieldExtensionSchema`        | `switchFieldValue`        | `SwitchElementContract`          |
| `radio`            | `RadioFieldConfigSchema`, `RadioOptionSchema`                 | `RadioFieldExtensionSchema`         | `radioFieldValue`         | `RadioElementContract`           |
| `slider`           | `SliderFieldConfigSchema`                                     | `SliderFieldExtensionSchema`        | `sliderFieldValue`        | `SliderElementContract`          |
| `combobox`         | `ComboboxFieldConfigSchema`, `ComboboxOptionSchema`           | `ComboboxFieldExtensionSchema`      | `comboboxFieldValue`      | `ComboboxElementContract`        |
| `drop-zone`        | `DropZoneFieldSchema`                                         | `DropZoneFieldExtensionSchema`      | `dropZoneFieldValue`      | `DropZoneElementContract`        |
| `fieldSet`         | `FieldSetConfigSchema`                                        | none                                | none: a container         | `FieldSetContract`               |
| `input-otp`        | `InputOTPFieldConfigSchema`                                   | `InputOTPFieldExtensionSchema`      | `inputOTPFieldValue`      | `InputOTPElementContract`        |
| `phone-input`      | `PhoneInputFieldSchema`                                       | `PhoneInputFieldExtensionSchema`    | `phoneInputFieldValue`    | `PhoneInputElementContract`      |
| `masked-input`     | `MaskedInputFieldSchema`                                      | `MaskedInputFieldExtensionSchema`   | `maskedInputFieldValue`   | `MaskedInputElementContract`     |
| `arrayElements`    | `ArrayElementConfigSchema`                                    | none                                | none: a container         | `ArrayElementContract`           |
| `submit`           | `SubmitButtonSchema`                                          | none                                | none: display-only        | `SubmitButtonElementContract`    |
| `submission-alert` | `SubmissionAlertConfigSchema`                                 | `SubmissionAlertExtensionSchema`    | none: display-only        | `SubmissionAlertElementContract` |

Every config schema is `BaseFieldSchema` extended with the element's `$type` and its own keys. `inputFieldExample`, `textareaFieldExample`, `maskedInputFieldExample`, `phoneInputFieldExample` and `dropZoneFieldExample` are sample configs for docs and tests. A renderer binds the contracts with `bindRegistry(defaultElementContracts, bindings)`, and `satisfies ElementBindings<typeof defaultElementContracts>` checks each `render` against the output of its contract's schema.

## View recipes

A recipe is a view of a form: a shell and slots that a renderer fills. The forms protocol, `formRecipeProtocol`, has the slots `shell`, `header`, `progress` and `actions`, in that order, and the kinds `single-step` and `wizard`; a `single-step` recipe cannot declare `progress` and a `wizard` recipe must declare `actions`. `defineRecipeSpec({ $type, kind, slotSchemas, slotDefaults?, appearanceAxes?, metadata })` declares a spec on that protocol, whose `spec.schema` is a Standard Schema, not a Zod one: validate a view with `safeParseStandardSchema` from `@schema-engine/registry`. `defineFormRecipe(spec, render)` binds a spec to a render payload: `shell` is required only when the spec declares a shell config, and `slots` holds one block for each other slot. React and Radiant each have a `defineRecipe` that fixes the payload types (`forms-react.md`, `forms-radiant.md`). A form chooses a recipe with `view: { $type, ...slots }`. `engine.describeViewCatalog()` returns the registered recipes (`$type`, `kind`, `slots`, `metadata`, `viewSchema`) and the rules for choosing a view, for editors and agents.

The built-in specs are in `@schema-engine/forms/recipes/built-in`, and `builtInRecipeSpecs` holds them by `$type`:

| Spec                    | `$type`               | Kind          | Slots                                    |
| ----------------------- | --------------------- | ------------- | ---------------------------------------- |
| `cardSpec`              | `card`                | `single-step` | `shell`, `header`, `actions`             |
| `splitScreenSpec`       | `split-screen`        | `single-step` | `shell`, `actions`                       |
| `heroBackgroundSpec`    | `hero-background`     | `single-step` | `shell`, `header`, `actions`             |
| `bareControlsSpec`      | `bare-controls`       | `wizard`      | `actions`                                |
| `cardWizardSpec`        | `card-wizard`         | `wizard`      | `shell`, `header`, `progress`, `actions` |
| `wizardSpec`            | `wizard`              | `wizard`      | `header`, `progress`, `actions`          |
| `sidebarWizardSpec`     | `sidebar-wizard`      | `wizard`      | `shell`, `header`, `progress`, `actions` |
| `heroWizardSpec`        | `hero-wizard`         | `wizard`      | `shell`, `header`, `progress`, `actions` |
| `splitScreenWizardSpec` | `split-screen-wizard` | `wizard`      | `shell`, `header`, `progress`, `actions` |

The same entry exports the slot config schemas they are built from, each a strict Zod Mini object with its inferred type: the shells `CardShellConfigSchema`, `HeroShellConfigSchema`, `SplitScreenShellConfigSchema` and `SidebarShellConfigSchema`, the header `StepHeaderConfigSchema`, the progress `MinimalProgressConfigSchema` and `StepIndicatorsConfigSchema`, and the actions `WizardActionsConfigSchema` and `FormActionsConfigSchema`. A label template in them takes `{current}` and `{total}`, which `formatStepLabel(template, current, total)` fills.

A recipe block reads the view from a `ViewModel`: `kind`, the resolved `viewConfig`, `form`, `steps` (the steps that are not skipped, each with `index`, `total` and `isActive`, `isCompleted`, `isInvalid` and `isVisited`), `activeStep`, `currentStepIndex` and `navigation`. `getSlotConfig(viewConfig, slot, schema)` reads one slot typed, without parsing it again. For a renderer of your own, `getViewRecipe(engine, config)` resolves the recipe a form's `view` selects (`undefined` without a `view`, and a throw for a `$type` the engine has not registered), and `projectViewSteps`, `createViewNavigation` and `buildViewModel` build the model from the runtime's step states and commands. All of these come from `@schema-engine/forms/recipes`.

## Normalized configs and values

- `defineForm`, `validateForm` and `validateElement` return configs frozen and owned by their engine. `isNormalizedFormConfig(value, owner?)` and `isNormalizedElementConfig(value)` tell one; `markNormalizedFormConfig` and `markNormalizedElementConfig` freeze and brand a config, which only an engine or a test should do. `getElementContainerKind(element)` is the container kind (`object` or `array`) a normalized element carries, and `getElementChildren(config)` the `elements` of a container. `assertFormEngine(engine, config)` throws when a render host has no engine to normalize authoring input with.
- `validateRegistrationConfig(schema, config)` parses one registration's config and throws the joined issue messages. `mergeControlProps(controlProps, htmlAttributes)` lays an element's `htmlAttributes` under the props the engine controls (identity, accessibility, disabled); pass static props only and wire handlers after.
- `getValueAtPath(values, path)` and `setValueAtPath(values, path, value)` read and write a dotted path, and `createDebounceScope()` makes keyed debounce state of its own, the kind a rule's `debounceScope` is. `toFieldArrayValue(rowIds, commands)` from `/state-container` turns an array's row ids and its `fieldArray(path)` commands into the field array a binding hands to its widgets, the same object until the rows change.
- `registerFormAgentTool` also takes `autoSubmit` (default `false`, so a person confirms the submit) and `formatIssue` (default: the engine's).

## Renderer-author helpers

For a renderer of your own. An application does not call these.

- Layout: `getRenderableSteps(config, currentStep)` is the steps to paint (only the current one with a `view`, every step flattened onto one page without), `stepGrid(config, step)` the grid that lays out a step's fields (the step's own `grid` replaces the form's), and `gridTrackItems(elements)` the elements whose placement counts the tracks of that grid, which you pass to `getGridVariables` so a grid takes twelve tracks when a child of a subgrid sets a `width`.
- Paths: a scope is where a field renders (a name prefix, a naming strategy and an instance id). `composeFieldName`, `composeFieldId` and `composeElementKey` build the name, the HTML id and the React key from an element and its scope, `arrayItemScope(arrayName, index, instanceId, { scalar? })` and `objectFieldScope(name, parent?)` build the scope of an array row and of a group, and `applyFieldOverlay(config, overlay)` returns a shallow copy of the frozen config with the overlay's `name`, `id` and `instanceId`.
- Values: `collectInitialValues(elements, defaultValues)` is the form's initial values (the fields' defaults under the given ones, each array padded to `minItems`), `seedArrayRows(element, rows, scalar)` the rows of an array container and `createArrayRowDefault(element, scalar)` the value of one new row. `usesScalarArrayItem(element, children)` is whether the rows are scalars (`tags.0`) or records (`users.0.name`), decided by the config alone, and `flattenStepElements(steps)` is every element of the steps.
