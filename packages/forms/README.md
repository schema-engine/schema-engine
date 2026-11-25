# @schema-engine/forms

The forms domain of Schema Engine: elements, validation rules, constraints, steps, the form state and the submit lifecycle, with no renderer. A form is a JSON document that names registered elements by `$type`. [`@schema-engine/forms-react`](https://www.npmjs.com/package/@schema-engine/forms-react) and [`@schema-engine/forms-radiant`](https://www.npmjs.com/package/@schema-engine/forms-radiant) draw it.

## Install

```bash
pnpm add @schema-engine/forms zod
```

First-party schemas use the `zod/mini` entry point. Registrations may use any [Standard Schema](https://standardschema.dev/) validator.

## Example

```ts
import * as z from 'zod/mini';
import { BaseFieldSchema, createFormEngine, defineInput } from '@schema-engine/forms';

const text = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: () => null,
});

const engine = createFormEngine({ elements: [text] });

const result = engine.safeValidateForm({
	id: 'contact',
	steps: [
		{
			id: 'details',
			title: 'Your details',
			elements: [{ $type: 'text', id: 'name', name: 'name', rules: [{ $type: 'required' }] }],
		},
	],
});
```

`result` is `{ success: true, data }` with the frozen, normalized config, or `{ success: false, issues }` with the `path` of every key to fix. To draw the form, give the engine and the config to a renderer: `FormRenderer` of Forms React or Forms Radiant. A renderer creates a `createFormRuntime` for each form it draws, which owns the submission, the wizard steps and every action; only a renderer author calls it.

## Entry points

| Import                                  | Holds                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `@schema-engine/forms`                  | The engine, `defineInput` and `defineStatic`, the runtime, the actions and the types  |
| `@schema-engine/forms/state-container`  | The form state container, its selectors and the issue formatter type                  |
| `@schema-engine/forms/csrf`             | CSRF policies for the engine's requests and native posts                              |
| `@schema-engine/forms/server-errors`    | `fromProblemDetails` and `fromJsonApiErrors`, to show a server's answer on its fields |
| `@schema-engine/forms/recipes`          | The forms recipe protocol, to write a view recipe                                     |
| `@schema-engine/forms/recipes/built-in` | The built-in recipe specs and their slot schemas                                      |
| `@schema-engine/forms/browser`          | Browser actions: auto-save, reset and analytics, with consent                         |
| `@schema-engine/forms/agent-tool`       | Offers a form to a browser agent as a WebMCP tool (experimental)                      |
| `@schema-engine/forms/testing`          | A conformance suite for a form state container, for any test runner                   |

## Documentation

- [Forms](https://schema-engine.com/docs/forms/overview): what a form can do.
- [Installation and quick start](https://schema-engine.com/docs/forms/getting-started): create the engine, check JSON and render it.
- [Engine and registrations](https://schema-engine.com/docs/forms/engine): the engine, custom fields and configuration errors.
- [Validation](https://schema-engine.com/docs/forms/validation) and [custom and async rules](https://schema-engine.com/docs/forms/validation-custom).
- [Form state](https://schema-engine.com/docs/forms/form-state), [Wizard and runtime](https://schema-engine.com/docs/forms/wizard) and [Actions in forms](https://schema-engine.com/docs/forms/actions).
- [Issue text](https://schema-engine.com/docs/forms/issue-text), [Server errors](https://schema-engine.com/docs/forms/server-errors) and [CSRF](https://schema-engine.com/docs/forms/csrf).
- [Agent tools](https://schema-engine.com/docs/forms/agent-tool) and [API reference](https://schema-engine.com/docs/forms/api-reference).
- [For AI agents](https://schema-engine.com/docs/schema-engine/agent-skill): the package ships its part of the agent skill.

## License

MIT
