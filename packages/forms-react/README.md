# @schema-engine/forms-react

The React renderer for [`@schema-engine/forms`](https://www.npmjs.com/package/@schema-engine/forms). It supplies `FormRenderer`, the hooks that bind your widgets to the engine's form state, and the primitives for view recipes. It ships no element registrations: you write your widgets, or optionally copy ready-made ones from the shadcn registry.

## Install

```bash
pnpm add @schema-engine/forms @schema-engine/forms-react @schema-engine/layout react react-dom zod
```

It needs React 19. Set `"jsx": "react-jsx"` in `tsconfig.json`.

## Example

```tsx
import * as z from 'zod/mini';
import { BaseFieldSchema, createFormEngine, defineInput } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { fieldText, useFormField } from '@schema-engine/forms-react/hooks';

const TextSchema = z.extend(BaseFieldSchema, { $type: z.literal('text') });

function TextField(config: z.output<typeof TextSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<input {...fieldProps} defaultValue={fieldText(defaultValue)} />
			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}

const text = defineInput({
	$type: 'text',
	schema: TextSchema,
	render: TextField,
	value: () => z.string(),
	metadata: { name: 'Text', category: 'input' },
});

const engine = createFormEngine({ elements: [text] });

const form = engine.defineForm({
	id: 'contact',
	steps: [
		{
			id: 'details',
			title: 'Your details',
			elements: [
				{
					$type: 'text',
					id: 'name',
					name: 'name',
					label: 'Name',
					rules: [{ $type: 'required', message: 'Enter your name' }],
				},
			],
		},
	],
});

export const Contact = () => <FormRenderer engine={engine} config={form} onSubmit={(values) => console.log(values)} />;
```

## Entry points

| Import                                                | Holds                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@schema-engine/forms-react`                          | `FormRenderer`, `FormProvider` and `FormEngineProvider`                                   |
| `@schema-engine/forms-react/hooks`                    | `useFormField`, `useFormContext`, `useWatch`, `useFieldArray`, the runtime and view hooks |
| `@schema-engine/forms-react/primitives`               | `FormElement`, `FormElements`, `ChildGrid` and `defineRecipe`                             |
| `@schema-engine/forms-react/contexts`                 | The view provider and context types                                                       |
| `@schema-engine/forms-react/components/form-debugger` | `FormDebugger`, a development panel                                                       |

## Documentation

- [Forms React](https://schema-engine.com/docs/forms-react/overview): what the package supplies.
- [Installation and quick start](https://schema-engine.com/docs/forms-react/getting-started): your first widget, and the optional shadcn registry.
- [Writing a widget](https://schema-engine.com/docs/forms-react/widgets): uncontrolled and controlled widgets.
- [Hooks](https://schema-engine.com/docs/forms-react/hooks) and [View recipes](https://schema-engine.com/docs/forms-react/layouts).
- [Other React state](https://schema-engine.com/docs/forms-react/other-react-state): mount a form in a panel that holds other state.
- [API reference](https://schema-engine.com/docs/forms-react/api-reference).
- [For AI agents](https://schema-engine.com/docs/schema-engine/agent-skill): the package ships its part of the agent skill.

## License

MIT
