# Schema Engine — context

## Core terms

- **Common language.** What Schema Engine is: a small set of rules for describing an interface or a process as a document, which every registry, engine and renderer reads the same way. The person who builds with it owns the vocabulary, and the language does not bend to a library or a framework.
- **Document.** Plain JSON, or YAML that parses to it, that describes an interface or a process by naming registered pieces. It holds no function or class instance, so it can be stored, sent from a server to a client and checked when it arrives.
- **`$type`.** The one key that says what a node is. Elements, action entries, validation rules and constraints carry it, and a registry looks it up.
- **Registration.** The code behind a `$type`: the `$type`, a Standard Schema for a node's configuration and metadata, plus what its domain adds (`render` for a component, `execute` for an action).
- **Registry (code).** A collection of registrations keyed by `$type`, built by `createRegistry` (read-only) or `createMutableRegistry` (mutable). Both give the same read side (`get`, `has`, `all`, `keys`, `size`, `kind`), so either goes wherever a registry is read. A function that finds a registration takes a `NodeLookup` (`get`, optional `kind` and `hint`); one that lists them takes an `ExportLookup` (`all`); a registry of either kind is both. A domain package declares no lookup interface of its own, and an action registry is `createRegistry('Action', [...])`. It is not the **shadcn registry**, which is a set of React source files copied into an app and is a Forms React term only. Never write "registry" bare where the two could be confused.
- **Child path.** Where a registration says a node holds child nodes: `{ keys, accepts? }` in `childPaths`, with `keys` the keys from the node to the slot and `accepts` a closed list of the `$type`s the slot takes (absent: any `$type` the lookup answers). `safeParseTree` walks a document by them and returns the **parsed document**, `tree.data`, whose child paths hold the children's data. The parent's schema keeps the slot opaque and declares every child key; `accepts` is the only way to restrict it. `exportTreeSchema` writes the JSON Schema of the same tree, replacing only the slot of each path by the union of what it accepts (`replaceChildSlot` on `@schema-engine/registry/json-schema` is that step, for code that writes JSON Schema itself).
- **JSON Schema target.** The dialect a JSON Schema is written for, by its Standard JSON Schema name: `'draft-2020-12'`, `'draft-07'`, `'draft-04'` or `'openapi-3.0'` (`JSONSchemaTarget`). The set is closed. Each API takes the subset it can write (`exportTreeSchema`: `'draft-2020-12'` and `'draft-07'`) and throws for any other target before it converts a schema. Zod's older spellings of the two drafts are not targets.
- **Action.** Registered behaviour: a `$type`, a schema for its entry, metadata and an `execute`. Say "action", never "plugin": a plugin is what an app's own plugin system registers in a mutable registry.
- **Action entry.** One object in a workflow: the `$type` of a registered action, an `id`, the action's own arguments and, optionally, `triggers` and `enabled`. An entry that is an array is a group whose members run in parallel. `parseActions` checks entries, each with `safeParseNode`, the registry's check of one node, and only what it returns can be dispatched.
- **Trigger.** The name of the event that starts a dispatch, such as `submit`. An entry answers it through its own `triggers`, else through the `defaultTriggers` of its registration.
- **Context.** What the caller hands to a dispatch. The dispatcher adds the entry's `config`, the `trigger`, `triggeredBy` and a `signal`.
- **Domain.** A job the language is given (forms is the first). It reuses the core and adds its own registrations and rules.
- **Element contract.** A registration without the renderer's part: the `$type`, schema, metadata and what a domain fixes (an element's value declaration, container kind and appearance axes), but no `render`. A renderer **binds** it (`bindRegistry`), adding only renderer data, and shares the schema by identity with every other renderer of the same contracts.
- **Renderer.** Turns a validated document into output with the registrations of its engine (Forms React, Forms Radiant). It does not own the rules for validating or dispatching.
- **Vocabulary / reference vocabulary.** The components and actions a team registers inside a domain, and the built-in set Schema Engine ships as a starting point to copy and change. Working terms, not final.

## Zod Mini and Standard Schema boundary

The engine uses Zod Mini for its first-party schemas and keeps Standard Schema as the provider-neutral registration boundary:

| Layer                  | Role                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `registry` / `actions` | `StandardSchemaV1` on every `BaseRegistration.schema`                                                   |
| `forms`                | Zod Mini for first-party authoring and JSON Schema export; `~standard.validate` at registration/runtime |
| `forms-react`          | Headless renderer; copied registry widgets bind the element contracts of `forms` to their components    |
| `forms-radiant`        | Radiant widgets that bind the same element contracts, through `bindRegistry`                            |

- **Element contract.** An element registration without the part one renderer adds (`render`, and an input's own `validations`): the `$type`, schema, metadata, value declaration, container kind and appearance axes.
- **Default element contracts.** The contracts of the 18 default widget `$type`s (for example `input`, `drop-zone`), defined once in `@schema-engine/forms/default-elements` and held in the registry `defaultElementContracts`. Say "default element contracts", not "built-in elements": forms ships no widget, only the contracts.

A renderer binds only its own part: `forms-radiant` binds every contract with `bindRegistry` (`radiantElements`), and each shadcn registry item spreads its contract into `defineInput` beside its component, because items are copied one at a time. `date` and `date-range` exist only in the shadcn registry and keep their schemas there. Custom registrations use the engine contract only (`defineInput`, `BaseFieldSchema`, Standard Schema). Library-shaped keys (iMask, drop-zone `accept`) are part of the contract; a renderer that cannot honour one ignores it.

### Rules

1. **Author** first-party field/action/config schemas with the functional `zod/mini` API. Installing the `zod` package is required to import its `zod/mini` entry point.
2. **Register** the concrete schema. Prefer `defineInput` / `defineStatic` so the render function is checked against schema **output**. Consumer schemas may come from any Standard Schema provider, including Zod, Valibot, and Effect Schema.
3. **Validate** via `~standard.validate` at engine and action boundaries. The registry package wraps the spec call in `safeParseStandardSchema` (import from `@schema-engine/registry`) for callers that prefer a tagged result over a thrown error.
4. **Consumers** may register custom elements with a hand-written Standard Schema — they are not required to install Zod unless they use Zod-authored built-ins.

Form authors supply schema **input** (defaults stay optional). After `defineForm` / `validateForm`, components receive schema **output**. Nested container `elements` are authored against the same engine registrations as top-level fields.

### Proof test

`packages/forms/test/lib/standard-schema-engine.test.ts` registers a native Standard Schema element, builds a FormEngine, and runs `defineForm`. Renderer packages exercise the same registration through `FormRenderer`.

## Forms logging

`@schema-engine/forms` and the renderer packages use `@ecopages/logger` through
each package’s shared `logger` instance. Tags identify
the package (`[schema-engine/forms]`, `[schema-engine/forms-react]`, and so on).
Debug output stays off unless the host enables Ecopages log levels.

## Radiant form state

`se-form-instance` creates the form's **form runtime** (below) from the normalized config, the engine's validation
registry and the defaults, and the runtime builds the form's **form state container** (below). The instance hands
the container to its `rui-form` with `connect(container, { formatError, submitHandler, resetHandler })`. `rui-form`
is only the control bridge, typed by Radiant UI's own `FormStateStore` interface: it sends each control's value
(`setValue`), blur (`blur`) and native validity (`reportNative`) into the container and presents what the container
holds, and it ignores its own `mode`, `defaultValues`, `resolver` and field `rules`. Radiant UI's form controls
dispatch the native `input` (the user changed the value) and `change` (the user committed it) on the host, never for
a value set from code, and a custom host announces itself with `announceControlConnect` when it connects, so a field
that registered earlier seeds it. `rui-change` stays only for components that are not form controls. The instance
provides the runtime, whose `container` is the form's state, on `formInstanceContext`, and scoped `FormController` instances read it there (`container`,
`select`, `wizard`, `submission`, `clearSubmission`, `formatIssue`); `formInstanceContext` itself is for a renderer's own blocks and recipes; there is no global active form. A new config, engine or `defaultValues` is a new container; moving the instance keeps it. `rui-form` is connected to the container as it is. Radiant UI's own choice controls hold text, a list of text or a list of numbers where the form holds the value its element declares, so the `select`, `combobox`, `radio`, `checkbox-group` and `slider` elements each wrap their control in a host (`se-select`, `se-combobox`, `se-radio-group`, `se-checkbox-group`, `se-slider`, built on `ControlHost` in `lib/control-host.ts`) whose `value` is the declared value: the host writes it into the control as the control holds it, maps what the user chose back, and dispatches the native `input` and `change` on itself. `FormInstanceElement` is internal to the `FormRenderer` view, which feeds it the callbacks through a `ref` (it has no property to assign and the package does not export it): the view's typed props are the one way to receive the submitted values. `registerHostControl` registers every host with `rui-field` in one of two modes: `wraps` (a host around a Radiant UI control, `ControlHost`, not form-associated, `submission: 'none'`) and `owns` (a host that renders its own control: the form-associated phone, OTP and masked inputs, `submission: 'host'`, and the drop zone, whose file input is the submitted control).
The application gives the engine a `formatIssue` that turns an issue (`type`, `ruleId`, `params`) into
text, and a renderer may override it for its forms (renderer over engine);
without one an issue shows its own `message` and otherwise nothing.
The instance mounts the runtime on connect and unmounts it on disconnect, and keeps only what an element can do: the focus, `rui-form`'s `sync`, the native submit with its CSRF field and the `se-action-*` events. The submission, the steps and every action dispatch are the runtime's, not those of elements that find each other in the document. The app binds the client engine by
assigning `engine` to `se-form-renderer`, before or after it upgrades, and the instance,
array and fields follow the renderer's context, so they catch up with an engine that
arrives or changes later.

## React form state

The form's **form runtime** (below) is created once per form instance, and its lifetime follows the
identity of the normalized form config passed to `FormRenderer`. Replacing that config starts a
fresh runtime and container with its defaults and step state. The container is the only form state: the hooks
read it with `useSyncExternalStore` through the engine's pure selectors, so a field re-renders only
for its own value, error or flags. A field binds in one of two modes: `useFormField(config)` is
uncontrolled (the DOM holds what the user types, a keystroke renders nothing, `fieldProps` carries `ref`, `name` and
the handlers and `defaultValue` starts the control) and `useFormField(config, { controlled: true })` is for a component
that takes only `value` and `onChange(value)`, and renders with its value. The runtime's change watch compares the container's
`values`, so a parent render by itself does not call `onChange` or dispatch a `form_change` action.

An issue (a field's, or why a submission failed) shows as the text of the `formatIssue` formatter set on `FormProvider`/`FormRenderer` for one form, else on the engine, else as its own `message`, else as nothing: the rule type is never shown, so a field
can be invalid with no text to show.

Radiant `FormEngineController` subscribes to the nearest ancestor
`formEngineContext` and resolves the active owning render on initial reads.
Renderer-owned field rendering resolves an explicit engine, then
that context, then the engine owning the current render. `se-form-renderer`
publishes a plain engine snapshot on the context. There is no module-level engine
registry or implicit single-engine fallback, so standalone hosts must receive an
engine through a renderer context or an explicit prop.
Constraint resolution belongs to the engine, not to a renderer. A constraint
names a sibling (`accountType`), so its value path depends on where the
declaring field is rendered: inside `contacts.0.email` the sibling is
`contacts.0.accountType`. `resolveConstraintPath` and `evaluateConstraints` own that rule, but only
`resolveParticipation` calls them: a renderer, including a standalone element, asks the container's participation
(or a one-step `resolveParticipation` of the element) and never resolves paths or evaluates constraints itself. A
one-element array compares as its element, so a single-selection control matches
an authored scalar.

Field references resolve identically for constraints and for validation, and
that is deliberate: `resolveFieldRef` is
the single implementation, and `resolveConstraintPath` is an alias of it. A
validation handler reaches it through the `ValidationContext` its second
argument carries — `resolve`, plus the form's nested `values` and the field's
rendered `fieldPath`. The context is required rather than optional so a renderer
cannot omit it and leave cross-field rules silently passing, which is what
happened while it was optional.

A rule that reads other fields declares them through `dependsOn` on its
registration, and `buildDependencyIndex` inverts those declarations into a
change-to-dependents map over rendered paths. Both renderers re-validate
dependents from that map and both ask `shouldSurfaceDependentError` whether the
result may be shown — touched, or the form submitted. That gate lives in the
engine rather than in each renderer, because the constraint subsystem already
demonstrated what happens when a decision of this class is made twice.
See [the controller contract](./packages/forms-radiant/src/adapters/radiant/controller/README.md).

## Form state container

The **form state container** (`FormStateContainer`, made by `createFormStateContainer` from
`@schema-engine/forms/state-container`) is the only form state, in both renderers. It is called a container, not a
store, because `FormStore` is a class of Radiant UI. It owns the nested value tree and the defaults, field state
(errors, warnings, touched, dirty, pending), the row ids of field arrays, the **native facts**, which paths take
part in validation and the `generation` of `reset()`. Every command is one atomic update and notifies once. Paths
are dotted with the row index in them (`contacts.1.email`), and `FORM_ROOT` (`'__root__'`) is the form itself.
Reads are pure selectors over its snapshot (`selectFieldState`, `selectValue`), so
React reads them through `useSyncExternalStore` and Radiant through `FormController.select`.

- **Issue.** What is wrong with a path, as data: `{ type, source, ruleId?, params?, message? }`. `source` is
  `validation`, `native` or `server` (and `submission` for a failure of the form as a whole, which the snapshot never
  holds). An error is an issue plus every issue of its path in `all`: what the server said, then each rule in
  authored order, then what the browser reported. An error is never inherited by a path below it.
- **Formatter.** The engine writes no text. `FormIssueFormatter = (issue, { path }) => string` is the one seam: the
  form's override, else the engine's `formatIssue`, else `issue.message`, else nothing, and never the rule type.
- **Native fact.** What the browser's `element.validity` says about a control, reported with
  `reportNative(facts)`: evidence no rule of the config produces. The first flag set is its `type`
  (`typeMismatch`, `tooShort`, and so on), and a control made invalid by a script's `setCustomValidity` is a
  `customError` with that text, in both renderers. It is bound to the value it was read for, dropped when
  the value changes, withdrawn with `null`, moved with its row, shown only when validation runs for that path and
  listed after the rules' own errors.
- **Validity.** `snapshot.isValid` is that no error is recorded (it validates nothing and is no reason to disable
  submit), `validate()` records and shows errors, and `checkValidity()` answers for the current values without
  recording any. `submit()` ends `passed` (with `values` and `setServerErrors`), `invalid` or `overtaken`.
- **No form library adapters.** Forms are configured, not coded, so no form library API reaches the user, and an
  adapter would give the same config a different meaning in each library. The integration point is the container's
  public contract and its conformance suite, `formStateContainerConformance` from `@schema-engine/forms/testing`. A
  hand-written form embeds a rendered one through values in and out (`defaultValues`, `onChange`, `onSubmit`) and
  shares no form state with it.

`@schema-engine/forms/server-errors` (`fromProblemDetails`, `fromJsonApiErrors`) turns an RFC 9457 or JSON:API
response into the input of `setServerErrors`, and `@schema-engine/forms/csrf` reads the token of
`createFormEngine({ csrf })`, which the engine's `fetch` sends on a same-origin unsafe request and a Radiant native
post carries as a hidden input.

## Recipes and the resolved view

A **recipe protocol** is the vocabulary a domain gives its recipes: the **slots** it
composes (in order), the **kinds** a recipe can take, and the **rules** that check a
recipe's kind against the slots it declares. `@schema-engine/layout` owns the machinery
that is the same for every domain: the spec, its binding to a render payload, slot
defaults and their merge, and `resolveRecipeView`, which resolves a document's view (below),
with the checks that a slot default parses against its slot schema and that a slot declaring
appearance axes accepts an `appearance` key. A domain declares its
protocol once with `defineRecipeProtocol({ slots, kinds, rules })`, and its specs and
bindings are then typed by it: a slot or kind outside the protocol is a type error, and
the rules run when a spec is defined and, on each winning registration, when the domain's
`Recipe` registry is built (`createRecipeRegistry`). Forms declares `shell | header |
progress | actions` and `single-step | wizard`, with the rules that a single-step recipe
declares no `progress` slot and a wizard recipe declares `actions`; the built-in form
recipes and their slot schemas stay in `@schema-engine/forms`.

A form selects a recipe with `view.$type`. `validateForm` writes the **resolved view**
into the normalized config, by calling layout's `resolveRecipeView` for the recipe
the view selects and keeping the form-only rules (the default wizard recipe, the step
count each kind needs, how schema issues are reported). Every slot the recipe declares is present and complete, so
renderers and blocks read it without parsing or defaulting. A slot's keys resolve in
this precedence: the author's config, then the recipe's **slot defaults**
(`slotDefaults` on the spec), then the slot schema's own defaults.

A multi-step form that omits `view` gets the engine's **default wizard recipe**
(`bare-controls`, or `createFormEngine({ defaultWizardRecipe })`) as its resolved view.
Engine build rejects a default that is not a wizard recipe. When the default is not
registered, `validateForm` warns once per form id and every step renders on one page.

## Form runtime

`createFormRuntime` (`@schema-engine/forms`) is one framework-free instance per rendered form, shared by
every renderer, so no renderer keeps its own copy of the lifecycle. It builds the **container** from the
normalized config, the engine's validation registry and the defaults, and owns what is around it: the
**submission** (`status`, `failures`, `submitCount`), the one lock, `form_mount`, `form_change` and
`onChange` (only when the values change), every action dispatch, the wizard's step state and navigation,
the action context and submit as Next. The container owns values, field state, validation, participation
(including skipped steps), the captured submission and `reset()`. The renderer owns the element and its
context, focus, `sync`, the native submit and its events, and passes them in as the runtime's `host`.

Every command (`next`, `back`, `goTo`, `submit`) returns one string of `FormRuntimeOutcome`: `moved`,
`submitted`, `failed`, `invalid`, `overtaken`, `refused`, `busy` or `cancelled`. Why a submission failed is in
`snapshot.submission.failures`, never in the return value. One lock covers navigation and submission, so a
command made while another runs is `busy`; a revoked command checks after every await and is `cancelled`.

**Reset rule.** `container.reset()` is the only reset, and there is no `runtime.reset()`: the container's
snapshot carries `generation`, which goes up on every reset, and when it changes the runtime revokes the
command in flight, returns the submission to idle with `submitCount` 0 and the steps to the first, firing no
step trigger. An action's `form.reset`, `useFormContext().reset`, a native reset and
`FormController.container.reset()` therefore reset everything.

The **agent tool** (`registerFormAgentTool`, `@schema-engine/forms/agent-tool`) is an experimental, opt-in entry that
offers a rendered form's runtime to a browser agent as a WebMCP tool: its input schema is the form's submission schema,
and its `execute` writes the values into the container and, with `autoSubmit`, calls `runtime.submit()`. No other entry
imports it, and the form config has no key for it.

## Submitted values

The **values** a form submits are typed by its config, and the runtime checks that the type is true.

- **Value declaration.** `value: (config) => StandardSchemaV1` on an input registration: what that element's control
  writes, as a function of the configured element (a select's `options` are an enum, an array of it with `multiple`; a
  rating's `max` is a bound). `defineInput` requires it and `defineStatic` has none. A container (a schema with
  `elements`; `containerKind` may sit beside it, `'object'` being the default) declares none, since its value is its children's, and `createFormEngine` rejects an input without `value` whose schema declares no `elements` (`containerKind` does not stand in for them, except for a schema that is not Zod, which cannot be read for `elements`). `defineInput` and `defineStatic` set a runtime `kind` (`'input'` or `'static'`), the one thing the engine reads to tell the two apart: the element's `metadata.category` is for display and decides nothing, so a static element may have the category `input`, and an input without `value` is rejected whatever its category. A registration written by hand states its `kind`, and `createFormEngine` rejects one that does not. Each registration type has its own `kind` discriminant (elements: `input` | `static`; recipes: `single-step` | `wizard`). A control that writes a value
  its declaration rejects is a bug in the control, fixed in the control.
- **Submission schema.** `engine.submissionSchema(config)` composes the declarations along the rules the container
  submits by (`lib/submission-shape.ts`, one walk for both): dotted names nest, a named container is an object of its
  children, a container of kind `array` is a list of rows, a one-child row is a list of values (unless `initialValues`
  or the child's default is a record, or the child is a container of its own that is not an array, such as a group, which
  makes the rows objects of the array's children), and `payload` keys are added. A key no field declares is not submitted. It
  strips what no field declares, exports JSON Schema where the value schemas can (its `input()` and `output()` throw for
  a value schema that has no JSON Schema), and has a `partial` that `defaultValues` are checked against when the
  runtime is created: a default that does not match its field is dropped whole (a list is one field, so one bad row drops the default of the list; a leaf inside a group is its own field), a warning names each field, and the form renders.
- **Absent value.** A hidden or disabled field, a field of a skipped step and a field never written are missing keys. A
  key is required (in the schema and in the type) only when the field has a `required` rule and neither it, a
  container around it nor its step has `constraints` or `disabled`. An optional leaf field's empty value (`''` or `null`)
  is submitted as it is, so a PATCH can tell "cleared" from "untouched", and its type allows it. A list or a group has no such value: its empty value is its empty list or object.
- **`valueMismatch`.** After `container.submit()` passes and before the submit actions, the runtime parses the values
  with the submission schema, and then with the application's own if the form was bound to one. A mismatch is a broken
  element contract, not a user error: the submission fails with a form-level `FormSubmissionIssue` of type
  `valueMismatch` (`params: { path }`), the error is logged and `onSubmit` is not called.
- **Values type.** `ValuesOf` reads a literal config and the engine's value entries: `engine.defineForm` returns the
  normalized config carrying it, or `FormValues` when the config is not a literal. A JSON config binds the
  application's schema with `engine.validateForm(json, { values })`, and the type is that schema's output. Renderers
  type `onSubmit`, `onAction` and `defaultValues` from the config; `onChange`, `useWatch` and live reads stay
  `FormValues`, since live values hold excluded and unfinished data.

## Wizard navigation

The form runtime owns wizard navigation for every renderer. Steps are keyed by **step id** (config
validation rejects duplicates). The runtime stores only `current`, `visited` and `complete`; a step's
`skipped` and `invalid` flags are derived from the values and the errors, so they cannot go stale. The
snapshot's `steps` lists every step in order with those flags, and **active** steps are those not skipped:
progress, "step 2 of 3" and a stepper count only them.

- `next()` syncs the host, validates the current step's fields, focuses its errors and stays when they fail
  (`invalid`, or `overtaken` when an edit outran the check, which focuses nothing), and otherwise marks the
  step complete and moves to the next active step. On the last active step it is `refused`. It never marks
  the form submitted.
- `back()` never validates and moves to the previous active step.
- `goTo(id)` refuses a skipped or unknown step; going back is always allowed; going forward follows the
  form's **navigation setting**, `navigation: 'linear' | 'free'` (default `'linear'`). Linear reaches only
  visited steps and validates the current step and every active step in between, landing on the first that
  fails; free reaches any active step without validating. `next()` validates in both.
- `submit()` before the last active step acts as `next()` in every renderer (**submit as Next**), so Enter in
  a field of an early step is a Next. On the last active step it runs `container.submit()` (every active step
  takes part), then the actions, then `onSubmit`. When validation fails it moves to the first active step
  with an error, firing the step triggers, and focuses that step's fields; an error about the form itself
  belongs to no step and stays put. After `onSubmit`, a server error that lands on another step moves there
  by the same rule, so it is never invisible. `submitCount` counts submissions that passed or failed
  validation, not a Next.

`step_leave` fires before the step changes and `step_change` then `step_enter` after it, and only when the
current step changes. **Step actions cannot block a move**, since the step's validation is the guard; their
failures are reported through `onActionResults`.

A step's **step actions** (its `actions`) are active while that step is current: every
trigger dispatches the form's `actions`, then the current step's, and
`collectStepActions` is the single rule. Because `step_leave`
fires while the step being left is current and `step_change` and `step_enter` once the
entered step is, a step's `step_enter` action runs on entering that step and its
`step_leave` action on leaving it, by Next, Back or a jump. Completing the last
step is a submission, not a step trigger: track it with `form_submit_success`.
Steps have no separate enter, leave or validate hooks. The action context carries the current `stepId`; its
`currentStep` is the position among the active steps and `totalSteps` their number.

### Skipped steps

A step takes `constraints` restricted to `show` and `hide`, with the constraint logic of fields. A step its
constraints hide is a **skipped step**: it is passed over by `next` and `back`, refused by `goTo`, hidden from
progress and the stepper, and its
fields take no part, as hidden fields do not: they are not validated, do not block, and are left out of
`checkValidity` and of the submitted values. Their values are kept and come back when the step is shown
again. Config validation allows a step constraint to read only non-row fields of earlier steps, so the first
step has none, the start is deterministic, one step is always active and there is no cycle. If the current
step becomes skipped, the runtime moves back to the nearest active step before it, firing the step triggers,
and never forward without validating.

**Excluded values are absent.** Steps and fields resolve in order (`resolveParticipation`), and the value of a
skipped step, or of a hidden field, counts as absent for every later constraint that reads it. Otherwise a
skipped step still holding `'yes'` would keep a later field shown and required.

## Array rows

A **row default** is the value a new array row starts with, whether the user
adds it or the form seeds it. `createArrayRowDefault` in `@schema-engine/forms`
is the single rule: each named child contributes its `defaultValue` (`''` for a
leaf without one, child containers recurse), then the container's
`initialValues` record is shallow-merged over it. A scalar row (one leaf child,
no object-shaped seed) is that child's default, without `initialValues`. **Seeded rows** come from
`seedArrayRows`: an array without a value starts with `minItems` rows, and at
least one when any descendant declares a `defaultValue`; a supplied array is padded to
`minItems`. `collectInitialValues` applies both to a form's initial values.
Every helper detects arrays by the registration's `containerKind: 'array'`,
never by `$type`, so custom array widgets seed like `arrayElements`.
A scalar row may hold `''`, `0` or `false`; both renderers keep it. Errors and
touched state follow their row through every field-array operation, an operation
naming a row that does not exist does nothing, and `remove` removes a repeated
index once.

## Validation issue / issue path

A **validation issue** is one problem `validateForm` found: `{ message, path }`, shaped like a Standard
Schema issue so the YAML layer (`parseYaml`) can point at the line. `path` names the config key the issue is
about, in the keys and indexes the author wrote (`['steps', 0, 'elements', 2, 'grid', 'width']`); an issue
about the whole form has the path `[]`.

- **Authored keys.** A path names what the author wrote, not what a viewport resolves. A cascade check
  (a grid area, a template that changes at a breakpoint) reports the authored key it resolves from, so an
  array `areas` is `['grid', 'areas']` and a breakpoint's template is `['grid', 'areas', 'md']`. Layout
  checks (`checkAppearance`, `resolveRecipeView`, `areaTemplateIssues`) return `LayoutIssue`s with paths
  relative to the thing they checked; forms lays them under that thing's location.
- **Schema issues.** One a schema reported also carries `code` and `params` (Zod's `too_small`, `minimum`,
  `values` and so on), so an editor can localize a diagnostic without parsing the English `message`. The
  engine's own checks have neither. A failed union is reported at the key that failed in the branch the
  value was closest to, or at the union when no branch is clearly closest.
- **Ids are decoration.** The `error.message` lines name the id of each element, step or action the path
  passes; `issue.path` and `issue.message` never do.

## Container state

A fieldset or array passes two states to every field inside it, at any depth.
While a container's `require` constraint holds, the fields inside it are
required; the container's own `required` rule does not pass down. A disabled
container, authored or by a constraint, disables them, and a disabled array
disables its add and remove buttons too. All of this is the container's: `resolveParticipation` evaluates every
constraint once, in order, and the snapshot's `participation` (`skippedSteps` and the `fields` states) reaches the
renderers through `selectFieldState(snapshot, path)`, which says `hidden`, `disabled` and `required` with the
ancestors folded in. React's `FormElement` and `useFormField`, Radiant's `se-constraint` and `se-field`, validation
and the runtime all read it, so show, disable and require cannot disagree.
Two Radiant gaps remain: a container that declares any constraint also passes
its own `required` rule down, and the add and remove buttons take the array's
disabled state at render only, so a `disable` constraint that starts to hold
later disables the rows but not the buttons.

## Layout theme

Grid and appearance live in `@schema-engine/layout`, which knows nothing about
forms, so any container of items can use it. `createLayoutTheme({ grid,
appearance }, { reservedNames })` compiles both into one **layout theme**: one
`id` and one stylesheet (`css`). Renderers put that id on
the form, grid and item elements as the single `data-se-theme` attribute and
emit the stylesheet for each form: React hoists equal stylesheets to one element,
while Radiant, which has no head hoisting, carries an identical self-contained copy in
every form (by design: each form is styled before hydration whatever the render
order, streaming, caching or removal of the others). `createFormEngine` and `createRadiantFormEngine` take
the theme as `layout`, either a compiled theme or inline `{ grid, appearance }`
options; there are no separate `grid` or `appearance` options. Engines built on
one compiled theme share its id and stylesheet, so a form embedded in a page
matches the page, and `engine.extend()` inherits the theme. `reservedNames` is a
compiler input: each domain lists the `data-se-*` attributes its renderers
already write, and an axis cannot reuse one (forms passes
`RENDERER_DATA_ATTRIBUTES`; an engine re-checks a theme compiled elsewhere).

The layout stylesheet knows no domain. It selects only `.se-grid`,
`.se-grid-item` and `[data-se-theme]`, and there is no alias for another class.
A renderer adds those two classes beside its own (`se-form-grid se-grid`,
`se-form-field se-grid-item`) on step grids, field hosts and container inner
grids; the forms classes stay as styling hooks.

## Grid theme ownership

Responsive grid layout is pure CSS. The **layout theme** owns the grid
vocabulary — breakpoint thresholds (`sm`…`2xl`), gap tokens (`none | compact |
default | loose | wide`), and the default minimum column width — through the
`grid` half of `layout`. The **form** owns layout intent: `columns`,
`gap`/`gapX`/`gapY` selection, `responsive` entries per breakpoint, and
per-field `grid` placement. Renderers emit the theme-scoped stylesheet
(`data-se-theme` identity) and per-container CSS variables inline during
render, so responsive behavior is media-query driven with no runtime
observers, SSR output is styled before hydration, and two engines with
different themes cannot overwrite each other. Field names must not collide
with `HTMLFormElement` properties in Radiant (e.g. `tagName`, `elements`) —
the form host carries field state keyed by field name. Configured breakpoint
thresholds must preserve named cascade order (`sm ≤ md ≤ lg ≤ xl ≤ 2xl`);
`rem`/`em` lengths are compared at a 16px root.

The split between the two is strict: **the stylesheet owns behavior** —
neutral defaults, the breakpoint cascade, and the `initial` resets that stop a
nested grid or field inheriting its parent's placement; the cascade is written
once per property over private, theme-scoped gates (the layout README, "The
stylesheet hooks", has the mechanism). **Inline custom properties carry only
values** an author wrote, so an element without a `grid` config emits no style
attribute. `place-*` shorthands are resolved into their axis longhands before
emission rather than declared in CSS, because a shorthand would have to follow
the longhands in the generated rule and would reset them; the split follows the
CSS grammar, so a two-keyword axis value such as `safe center` stays on one
axis.

Named widths are the same mechanism, not a second one. An element's `grid.width`
(`full | three-quarters | two-thirds | half | third | quarter`) and
`grid.offset` (the same names without `full`) resolve to spans and
start lines on 12 tracks and are emitted into the shared `grid-column` slot, so
they inherit the breakpoint cascade (`grid.responsive`) and the inheritance
resets. They are one declaration, so a slot that authors only one of the two
carries the other from the narrower slots, as `columns` and `minColumnWidth` do
for the template. A step whose top-level elements use `width` or `offset` gets
the 12-track template and a `--se-grid-default-column` of `1 / -1` inline from
`getGridVariables`, which the stylesheet resets on every grid and reads as
the fallback of a field's `grid-column`, so a field with no width fills the
row. A grid uses areas, `columns` (and `minColumnWidth`) or widths: validation
rejects both together, a field that sets `width` or `offset` with a raw
`column`, an offset plus width past 12 tracks (counting values carried from
narrower slots). A raw `column` field beside width fields counts the same 12
tracks (`span 2` is a sixth of the row). Raw `column`, `row` and `placeSelf`
remain the escape hatch, and `column: 2` is a grid line, not a span.

Drawn layouts are the same mechanism again. A grid's `areas` (an array of row
strings, or a record per cascade slot) is emitted as a `--se-grid-areas` custom
property of quoted rows, with `--se-grid-template` carrying the track count the
rows draw, one pair per slot the author wrote. The stylesheet reads
`grid-template-areas` through the breakpoint cascade with a `none` fallback and
resets it like any other grid property. A field's `grid.area` is emitted as its
`grid-column` and `grid-row` (a lone name there means that area's start and end
lines), so it rides the shared field table with no new rule. Area names are
ASCII CSS identifiers, which the schema enforces (and the JSON Schema export
carries as a case-explicit pattern): the pattern keeps quotes, `;` and
whitespace out of the quoted template and out of the area value. It does not
sanitize the other authored values that reach `var()`, such as raw `column`/`row`
and gaps, which stay the author's CSS. A step's `grid` replaces the form's grid
for that step (`stepGrid(config, step)` in `form-view.ts` is the one owner of
the rule, used by validation and both renderers), because a template names
specific fields. Validation reads templates and areas
through the same cascade the stylesheet applies and rejects ragged or
non-rectangular templates, an area outside the template at any breakpoint, an
unclaimed template area, `areas` beside `columns`, `minColumnWidth`, `width` or
`offset`, and `area` beside `width`, `offset`, `column` or `row`. Containers take
no `areas`, so `area` on a container's child is rejected.

Containers are grids too. A fieldset, and each array row, lays its direct
children out in an inner `se-form-grid se-grid` carrying the engine's theme id, built
with the same `getGridVariables(undefined, layout.grid, children)` a step uses; a field
host takes its variables from `getGridItemVariables(grid)`.
The grid rule resets `--se-grid-default-column` on every grid and the inner
grid declares its own, so a child's width and default placement come from its
container and never from the step around it. The step's `columns` and a
container's child widths therefore do not conflict; the over-width and raw
column checks apply to every element at any depth.

Two contracts follow from the field rule outranking a component's own class.
Gap tokens (`--se-grid-gap-*`) are never declared on an element — the theme
declares `--se-grid-gap-base-*` and reads the public token with that as the
fallback — so a host's `:root` override still applies. Gap tokens may change by
breakpoint through the theme's `grid.responsive` option, which is breakpoint-major
like a form's own: each entry lists the tokens that change at that width. A ramp
redeclares only the base variable inside the generated media queries, so a form
selecting `gap: 'default'` inherits the rhythm and rhythm stays theme vocabulary
rather than form intent. A host override replaces the token at every width, ramp
included, since the public token is the first `var()` argument.

Per-element rhythm is part of the same mechanism, not a second one. An element's
`grid.marginBlockStart` / `grid.marginBlockEnd` take the same gap tokens and ride
the shared item property table, so they inherit the breakpoint cascade and the
inheritance resets and one system keeps owning the block axis. They apply to any
element that renders a `.se-grid-item` host (`se-form-field se-grid-item`) carrying the engine's theme id —
inputs get it from the field primitive, and a content or decoration element opts
in with `useFieldHost` (React) or `mergeFieldGridHost` (Radiant). An element
without that host ignores its `grid` config entirely. And an item host with
its own layout sets `--se-item-display-mode` instead of `display`, which
responsive `hidden` toggles against rather than forcing `block`.

## Appearance axis

An **appearance axis** is one independent dimension of appearance, with 2 to 5 named values. Each value
stands for a set of semantic CSS tokens, which components read; components never read an axis
value. The theme declares the axes (`defineAxis`, held in a read-only registry), a registration
declares which axes it responds to (`appearanceAxes`), and a document picks values that pass down
from the document to a container to an item or slot, a closer pick winning. A good axis:

- is orthogonal to the other axes;
- means the same on every component, so a token names a role (`--se-space`, `--se-shadow`), never a
  component; an idea that fits one component is slot config;
- has a small closed set of named values, because a raw value is a token override;
- controls appearance only, never structure, which is slot config or the grid.

`size` and `surface` are built in. The catalog and the JSON Schema export list each axis and its
values, so `appearance.size` on a form and its steps is an enum in an editor. An element's and a
recipe slot's `appearance` lists only the axes its registration declares, closed, so an undeclared
axis is rejected there as it is by validation. The children of a container element (a fieldset or an
array row) are typed in the export as the union of every element's schema, so they get the same
closed `appearance`; a lazy element schema keeps its own `appearance`, which validation still checks.

## Appearance ownership

Named appearance mirrors the grid split. The **layout theme** owns the vocabulary through the
`appearance` half of `layout`: a list of **appearance axes** built with `defineAxis` and stored in a
registry. `builtInAxes` (`size` as `compact | default | comfortable` and `surface` as
`flat | outlined | elevated`) is the default list; a host writes
`appearance: [...builtInAxes, tone]` to add an axis such as `tone`, and an axis listed later with
the same `$type` replaces the earlier one. Each value stands for semantic CSS custom properties
(`--se-space`, `--se-shadow`). The **form** owns intent: a form, a step, a field or a view slot picks a value per axis with
`appearance: { size: 'compact' }`. A renderer never defaults or interprets a pick; it emits it.

Each element registration declares the axes it supports (`appearanceAxes`), and each recipe
spec declares them per slot; the engine build rejects an axis the vocabulary does not declare (`appearanceAxes: { shell: ['size', 'surface'] }`). An axis
that is not declared fails validation naming the axis and the owner, so the same config means
the same thing in every renderer. `validateForm` checks every pick against the vocabulary and the
declarations (an unknown axis, an undeclared axis for that owner, an unknown value), then writes
the **resolved appearance** into the normalized config the way it writes the resolved view: the
form's picks, then the step's, then each containing element's, then the field's own; a view slot
takes the form's picks and then its own. Each owner keeps only the axes it supports. An element without a resolved pick carries no
`appearance` key. An element registration's schema never sees the key; the engine strips it before
parsing and writes it back, so a custom element whose schema is strict still supports axes. A recipe slot
schema that declares axes must still accept an `appearance` key so authored configs type-check; the
engine does not pass it to the schema when parsing the view and writes the resolved pick back.

The names of the other `data-se-*` attributes the renderers write (`RENDERER_DATA_ATTRIBUTES`, which includes `theme`) are reserved and cannot be axes; forms passes the list to the layout compiler as `reservedNames`, and a test scans the renderer sources so the list cannot drift.

The pure appearance helpers live in `@schema-engine/layout`: checking a pick against the vocabulary
(`checkAppearance`), merging a parent pick with a child's (`mergeAppearance`), keeping the axes an owner
supports, and producing the attributes (`getAppearanceAttributes`). Walking the form tree is forms' job:
`resolveAppearance` in `lib/resolve-appearance.ts` is the one place the inheritance rule lives, called for
the form, each step, each element and each view slot.

Both renderers emit the resolved selection as `data-se-<axis>="<value>"` on the form element
(the one carrying `className` and `style`: `<form>` in React, `rui-form` in Radiant), the step
element (`data-se-step`), the field host and the slot elements. The token rules are part of the
layout theme's one stylesheet, emitted once per form. Each rule sits inside `:where()`, so it adds no
specificity and an author's `className` always wins; the scope is `data-se-theme`, the layout theme's
id, which sits on the form element and also on every grid and item. A rule reaches the element that
carries the theme and the pick together, or a descendant of the theme's root with no other theme
between, so the nearest theme wins: a form of one engine nested in a grid item of another takes its
own tokens, whichever stylesheet comes later. The same rules are emitted again in one `@scope (theme) to
(other theme)` block, which a browser without `@scope` ignores; they make a theme re-entered below
another theme exact too, and, because scope proximity outranks source order, a zero-specificity author
rule such as `:where(.x)` loses to a token rule in a browser that has `@scope` (the layout README,
"Nested themes", has the details). Shells read
the tokens (`var(--se-space, 1.5rem)`) and keep the look of an unstyled form as the
fallback. The built-in tokens name no host theme: a renderer's fallback is where its host theme
variables belong (Radiant's card reads `var(--se-space, var(--space-6, 1.5rem))`), and the
built-in `size.default` sets its tokens to `initial`, which hands them back to the component's
fallback, so `size: default` looks like no pick in a themed app, also inside a `compact` form. `size` sets a control height the same way (`--se-control-height`, from the hooks `--se-control-height-compact` and `--se-control-height-comfortable`, which an author sets on `:root` or any ancestor, in either renderer; each falls back to a `--se-renderer-*` twin a renderer maps from its theme, then to a neutral value): Radiant maps it onto its `--size-control-md`, the React registry controls that carry `data-se-control` read it through `controls.css`, which an app imports unlayered because a shadcn control's height is a Tailwind utility that outranks every layered rule. What a host's own axis looks like is the host's CSS, keyed on the same attributes. A value
that declares no tokens inherits the surrounding value's tokens through custom-property inheritance,
also from a pick made outside a nested form of another theme, until that form picks a value that
declares those tokens. The DOM contract is the same in
every renderer; the visual effect of a built-in value is not yet: `size` changes a field's font size in
both renderers, and both card shells read the tokens; the hero, split screen, sidebar and stack shells read `--se-space` for their padding and gaps, and the first three declare `size` on their `shell` slot. The shared field layout is the font size, a text input that fills its field (in React, the shadcn `Input`'s own `w-full`) and the action bar's `align`; the rest of a field's look is renderer styling. A field's `className` is applied to the same field host, the element that carries its `style` and the attributes, in both renderers. The field host that carries the attributes is the
inner `.se-form-field` (the Radiant constraint wrapper around it carries only grid placement).

`maxWidth`, `padding` and `shadowSize` are gone: the `size` and `surface` tokens set the padding, border and shadow, and the card's width is the readable measure `--se-measure`. `contentWidth`, `sideWidth` and
the structural keys (`showDescription`, `orientation`, `labels`, `align`) stay in slot config
because they change layout or content, not appearance. `style` is the escape hatch for what the
vocabulary does not cover and accepts only `--custom-property` keys with string or number values.
