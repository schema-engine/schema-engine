# @schema-engine/forms

The engine, the config, validation timing, constraints, the container and, for renderer authors, the runtime. The terms are defined in the router (`SKILL.md`).

## Engine

`createFormEngine` (options: `CreateFormEngineOptions`) takes `elements`, `recipes`, `actions`, `validations` (extra rules), `layout`, `formatIssue`, `fetch`, `csrf` and `defaultWizardRecipe`. It builds read-only registries (a later `$type` replaces an earlier one) and returns an immutable engine: create it once and reuse it. `engine.extend({ ... })` (`ExtendFormEngineOptions`: `elements`, `recipes`, `actions` and `validations`) adds registrations and inherits the layout theme, the formatter, `fetch`, `csrf` and the default wizard recipe. An app gives the engine and a config to a renderer: `FormRenderer` in `forms-react.md` or `forms-radiant.md`. The package ships no field widgets, only the contracts of the 18 default elements in `@schema-engine/forms/default-elements` (`defaultElementContracts`, and per element a schema such as `CheckboxFieldConfigSchema`, its types, its value declaration and `CheckboxElementContract`: a registration without `render`); a renderer binds `render` to a contract, and an element of your own is registered with `defineInput({ $type, schema, metadata, value, render })` (see Registrations below), and renderer packages bring the widgets.

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

Authors supply schema input, so defaults stay optional; renderers receive schema output. `defineForm` and `validateForm` run one pipeline and throw a `FormValidationError` on an invalid form; `engine.safeValidateForm(json)` returns `{ success, data | issues }` with the config `path` of each issue; `formatIssuePath(path)` from `@schema-engine/registry` writes a path as `steps[0].elements[2].name`. A step needs an `id` and a `title`.

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

Form-level keys: `view` (a registered recipe, optional for a one-step form), `validationMode`, `reValidateMode`, `navigation` (`linear` or `free`), `payload`, `actions`, `grid` and `appearance`. A multi-step form with no `view` gets the engine's default wizard recipe: `defaultWizardRecipe` names it and must be a registered `wizard` recipe (the default is `bare-controls`, which is `DEFAULT_WIZARD_RECIPE`).

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

`@schema-engine/forms/default-elements` holds one contract for each of the 18 default elements. A contract is a registration without `render` and `validations` (`InputContract` for an input, `StaticContract` for a display-only element), so every renderer agrees on an element's schema and on the value its control writes. For each element the entry exports its config schema, the types inferred from it, a `...FieldValue` declaration of what the control writes and the contract.

| `$type`            | Config schema                                                 | Own-keys schema                     | Config types                                                                     | Value declaration         | Contract                         |
| ------------------ | ------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- | ------------------------- | -------------------------------- |
| `input`            | `InputFieldSchema`                                            | `InputFieldExtensionSchema`         | `InputFieldConfig` (input), `InputFieldOutput` (output)                          | `inputFieldValue`         | `InputElementContract`           |
| `textarea`         | `TextareaFieldSchema`                                         | `TextareaFieldExtensionSchema`      | `TextareaFieldConfig`                                                            | `textareaFieldValue`      | `TextareaElementContract`        |
| `number`           | `NumberFieldConfigSchema`                                     | `NumberFieldExtensionSchema`        | `NumberFieldConfig`, `NumberFieldExtension`                                      | `numberFieldValue`        | `NumberElementContract`          |
| `select`           | `SelectFieldConfigSchema`, `SelectOptionSchema`               | `SelectFieldExtensionSchema`        | `SelectFieldConfig`, `SelectFieldExtension`, `SelectOption`                      | `selectFieldValue`        | `SelectElementContract`          |
| `checkbox`         | `CheckboxFieldConfigSchema`                                   | `CheckboxFieldExtensionSchema`      | `CheckboxFieldConfig`, `CheckboxFieldExtension`                                  | `checkboxFieldValue`      | `CheckboxElementContract`        |
| `checkbox-group`   | `CheckboxGroupFieldConfigSchema`, `CheckboxGroupOptionSchema` | `CheckboxGroupFieldExtensionSchema` | `CheckboxGroupFieldConfig`, `CheckboxGroupFieldExtension`, `CheckboxGroupOption` | `checkboxGroupFieldValue` | `CheckboxGroupElementContract`   |
| `switch`           | `SwitchFieldConfigSchema`                                     | `SwitchFieldExtensionSchema`        | `SwitchFieldConfig`, `SwitchFieldExtension`                                      | `switchFieldValue`        | `SwitchElementContract`          |
| `radio`            | `RadioFieldConfigSchema`, `RadioOptionSchema`                 | `RadioFieldExtensionSchema`         | `RadioFieldConfig`, `RadioFieldExtension`, `RadioOption`                         | `radioFieldValue`         | `RadioElementContract`           |
| `slider`           | `SliderFieldConfigSchema`                                     | `SliderFieldExtensionSchema`        | `SliderFieldConfig`, `SliderFieldExtension`                                      | `sliderFieldValue`        | `SliderElementContract`          |
| `combobox`         | `ComboboxFieldConfigSchema`, `ComboboxOptionSchema`           | `ComboboxFieldExtensionSchema`      | `ComboboxFieldConfig`, `ComboboxFieldExtension`, `ComboboxOption`                | `comboboxFieldValue`      | `ComboboxElementContract`        |
| `drop-zone`        | `DropZoneFieldSchema`                                         | `DropZoneFieldExtensionSchema`      | `DropZoneFieldConfig`                                                            | `dropZoneFieldValue`      | `DropZoneElementContract`        |
| `fieldSet`         | `FieldSetConfigSchema`                                        | none                                | `FieldSetConfig`, `FieldSetInput`                                                | none: a container         | `FieldSetContract`               |
| `input-otp`        | `InputOTPFieldConfigSchema`                                   | `InputOTPFieldExtensionSchema`      | `InputOTPFieldConfig`, `InputOTPFieldExtension`                                  | `inputOTPFieldValue`      | `InputOTPElementContract`        |
| `phone-input`      | `PhoneInputFieldSchema`                                       | `PhoneInputFieldExtensionSchema`    | `PhoneInputFieldConfig` (input), `PhoneInputFieldOutput` (output)                | `phoneInputFieldValue`    | `PhoneInputElementContract`      |
| `masked-input`     | `MaskedInputFieldSchema`                                      | `MaskedInputFieldExtensionSchema`   | `MaskedInputFieldConfig`                                                         | `maskedInputFieldValue`   | `MaskedInputElementContract`     |
| `arrayElements`    | `ArrayElementConfigSchema`                                    | none                                | `ArrayElementsConfig`, `ArrayElementsInput`                                      | none: a container         | `ArrayElementContract`           |
| `submit`           | `SubmitButtonSchema`                                          | none                                | `SubmitButtonConfig`                                                             | none: display-only        | `SubmitButtonElementContract`    |
| `submission-alert` | `SubmissionAlertConfigSchema`                                 | `SubmissionAlertExtensionSchema`    | `SubmissionAlertConfig`, `SubmissionAlertExtension`                              | none: display-only        | `SubmissionAlertElementContract` |

Where an element has one, the config schema is `BaseFieldSchema` extended with the element's own keys (its `Extension`). `inputFieldExample`, `textareaFieldExample`, `maskedInputFieldExample`, `phoneInputFieldExample` and `dropZoneFieldExample` are sample configs for docs and tests. A renderer binds a contract with `bindRegistry(defaultElementContracts, bindings)`: `ElementBinding` is what it binds to one contract (the `render`, which takes the schema output) and `ElementBindings<typeof defaultElementContracts>` with `satisfies` checks all of them.

## View recipes

A recipe is a view of a form: a shell and slots (`header`, `progress`, `actions`) that a renderer fills. The forms protocol (`formRecipeProtocol`) has four slots in the order `shell`, `header`, `progress`, `actions` and two kinds, `single-step` and `wizard` (`RecipeSlot` and `RecipeKind`). A `single-step` recipe cannot declare `progress` and a `wizard` recipe must declare `actions`. `defineRecipeSpec({ $type, kind, slotSchemas, slotDefaults?, appearanceAxes?, metadata })` declares a spec (`RecipeSpec`, with `RecipeSlotSchemas`, `RecipeSlotDefaults` and `RecipeMetadata`) whose `spec.schema` is a Standard Schema, not a Zod one: validate a view with `safeParseStandardSchema` from `@schema-engine/registry`, and read its types with `StandardSchemaV1.InferInput` and `InferOutput` (`RecipeViewSchema` is its type). `defineFormRecipe(spec, render)` binds a spec to a render payload, which a renderer types with `RecipeRenderPayload<TSlots, TShell, TSlot>` (a `shell` is required only when the spec declares a shell config, and `slots` holds exactly the others); the shell receives a `FormShellLayout` (`slots` and `viewConfig`). React and Radiant each have a `defineRecipe` that fixes the payload types (`forms-react.md`, `forms-radiant.md`). A form chooses a recipe with `view: { $type, ...slots }` and the engine finds it with `getRecipe`; `RecipeRegistration` and `AnyRecipeRegistration` are the registered recipe. `engine.describeViewCatalog()` returns a `ViewCatalog` of `RecipeDescriptor`s (`$type`, `kind`, `slots`, `metadata`, `viewSchema`) and the rules for choosing a view, for editors and agents.

The built-in specs are in `@schema-engine/forms/recipes/built-in`, and `builtInRecipeSpecs` lists them:

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

The slot configs have a Zod Mini schema and an inferred type each: `CardShellConfigSchema` (`CardShellConfig`), `HeroShellConfigSchema` (`HeroShellConfig`), `SplitScreenShellConfigSchema` (`SplitScreenShellConfig`), `SidebarShellConfigSchema` (`SidebarShellConfig`), `StepHeaderConfigSchema` (`StepHeaderConfig`), `MinimalProgressConfigSchema` (`MinimalProgressConfig`), `StepIndicatorsConfigSchema` (`StepIndicatorsConfig`), `WizardActionsConfigSchema` (`WizardActionsConfig`) and `FormActionsConfigSchema` (`FormActionsConfig`). Their text templates take `{current}` and `{total}`, which `formatStepLabel(template, current, total)` fills.

A recipe block of a renderer reads the view from a `ViewModel`: `kind`, the resolved `viewConfig`, `form`, `steps` (`ViewStep`, the steps that are not skipped, with `index`, `total` and flags), `activeStep`, `currentStepIndex` and `navigation` (`ViewNavigation`). `getSlotConfig(viewConfig, slot, schema)` reads one slot typed, `getViewRecipe(engine, config)` resolves the recipe a form's `view` selects (and throws for one the engine has not registered), and `projectViewSteps`, `createViewNavigation` and `buildViewModel` build the model from the runtime's step states and commands, for a renderer of your own.

## Types and helpers

- Engine: `FormEngine` is the class `createFormEngine` returns, `FormEngineFromOptions` its type for a set of registration lists and `FormEngineRuntime` the operations a renderer needs while rendering (what a renderer types its `engine` as). `assertFormEngine(engine, config)` is the boundary check a render host makes before it normalizes authoring input. `ElementRegistry`, `RecipeRegistry` and `ActionRegistrationRegistry` are the read-only stores of each kind. The lists passed to `createFormEngine` must satisfy `ElementRegistrationConstraint`, `RecipeRegistrationConstraint` and `ActionRegistrationConstraint`, and `EngineOutputMaps` holds the parsed config of each `$type`.
- Registrations: `InputRegistration` (`kind: 'input'`) and `StaticRegistration` (`kind: 'static'`) are what `defineInput` and `defineStatic` build, `ElementKind` says which, `AnyElementRegistration`, `AnyRecipeRegistration` and `AnyActionRegistration` are the erased forms the registries store, and `ElementMetadata` is the metadata of an element (a component's, with a required `category`). `ElementRenderProps<Schema>` is what a `render` receives: the schema output with its children normalized and an `instanceId`. `ContainerKind` is `object` or `array`, how a container composes its children's paths, and `ValueDeclaration` is the function from a configured element to the Standard Schema of its value.
- Config: `FormConfig`, `FormStep` and `FormViewConfig` are the config of a form, a step and a view narrowed to one engine's registrations, and `ElementConfig<TElements>` is the configs an engine's elements accept, `ElementId` their `$type` names and `GetElementConfig<TType, TElements>` the config of one. `BaseField` and `BaseFieldInput` are the output and input of `BaseFieldSchema`, `ConstraintLogic` the `{ field, operator, value }` of a constraint and `StepConstraint` a constraint that shows or hides a step. `FormConfigView` is the readable shape that accepts authoring and normalized config alike. `NormalizedFormConfig` and `NormalizedElementConfig` are what `defineForm`, `validateForm` and `validateElement` return, frozen and owned by their engine: `isNormalizedFormConfig(value, owner?)` and `isNormalizedElementConfig(value)` tell one, `markNormalizedFormConfig` and `markNormalizedElementConfig` make one, `getElementContainerKind(element)` reads the container kind it carries, and `getElementChildren(config)` the `elements` of a container, typed as `ElementChildrenInput` and `ElementChildrenOutput`. `ValidateFormOptions` is what the form check reads from its owner (the engine's registries, the `values` schema and the default wizard recipe), and `validateRegistrationConfig(schema, config)` checks one registration's config and throws. `mergeControlProps(controlProps, htmlAttributes)` lays an element's `htmlAttributes` under the props the engine controls (identity, accessibility, disabled).
- Values: `ValuesOf` is the values a form submits, read from its literal config and the engine's `ValueEntry` per element `$type`, `DefaultValuesOf` what a form may start from (every key optional at every depth), `ValuesBrand` the values type a normalized config carries, and `DeepReadonly` a type read-only at every depth. `getValueAtPath(values, path)` and `setValueAtPath(values, path, value)` read and write a dotted path, and `createDebounceScope()` makes keyed debounce state of its own (`DebounceScope`), the kind a rule's `debounceScope` is.
- Container: `FormStateContainer` is the commands and stable reads over a form's state, `FormStateSnapshot` the immutable state a subscriber reads and `FormStateHydration` its serializable part. `FormStateContainerConfig` is what `createFormStateContainer` reads from a normalized config, `FormStateContainerOptions` what a `FormStateContainerFactory` builds a container from, and `FieldArrayCommands` the operations of one array, which `toFieldArrayValue(rowIds, commands)` turns into the `FieldArrayValue` a binding hands to its widgets.
- Testing and agents: `ConformanceRunner` is the `describe` and `test` of a test runner, which `formStateContainerConformance` takes. `FormAgentToolOptions` is what `registerFormAgentTool` takes: `name`, `description`, `autoSubmit` (default `false`, so a person confirms the submit) and `formatIssue` (a `FormAgentIssueFormatter`), and the tool answers with a `FormAgentToolResult`, the MCP text result.

## Renderer-author helpers

For a renderer of your own. An application does not call these.

- Layout: `getRenderableSteps(config, currentStep)` is the steps to paint (only the current one with a `view`, every step flattened onto one page without), `stepGrid(config, step)` the grid that lays out a step's fields (the step's own `grid` replaces the form's), and `gridTrackItems(elements)` the elements whose placement counts the tracks of that grid, which you pass to `getGridVariables` so a grid takes twelve tracks when a child of a subgrid sets a `width`.
- Paths: `FieldScope` is where a field renders (a name prefix, a naming strategy and an instance id) and `FieldOverlay` the render-time override of a frozen element. `composeFieldName`, `composeFieldId` and `composeElementKey` build the name, the HTML id and the React key from an element and its scope, `arrayItemScope` and `objectFieldScope` build the scope of an array row and of a group, and `applyFieldOverlay(config, overlay)` applies an overlay without cloning the config.
- Values: `collectInitialValues(elements, defaultValues)` is the form's initial values (the fields' defaults under the given ones, each array padded to `minItems`), `seedArrayRows(element, rows, scalar)` the rows of an array container and `createArrayRowDefault(element, scalar)` the value of one new row. `usesScalarArrayItem(element, children)` is whether the rows are scalars (`tags.0`) or records (`users.0.name`), decided by the config alone, and `flattenStepElements(steps)` is every element of the steps.
