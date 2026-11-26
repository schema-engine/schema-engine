# @schema-engine/forms-radiant

The Radiant renderer for [`@schema-engine/forms`](https://www.npmjs.com/package/@schema-engine/forms), for Ecopages apps that use `@ecopages/radiant-ui`. The 18 elements and the view recipes ship in the package, so there is no copy step.

## Install

```bash
pnpm add @schema-engine/forms @schema-engine/forms-radiant @schema-engine/layout @ecopages/radiant-ui @ecopages/radiant @ecopages/jsx @ecopages/signals zod
```

Set `"jsx": "react-jsx"` and `"jsxImportSource": "@ecopages/jsx"` in `tsconfig.json`, and load the stylesheets once:

```css
@import '@ecopages/radiant-ui/themes/default';
@import '@ecopages/radiant-ui/styles.css';
@import '@schema-engine/forms-radiant/index.css';
```

## Example

```tsx
import type { FormConfig, FormValues } from '@schema-engine/forms';
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

const contactConfig: FormConfig = {
	id: 'contact',
	steps: [
		{
			id: 'details',
			title: 'Your details',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Name',
					rules: [{ $type: 'required', message: 'Enter your name' }],
				},
				{ $type: 'submit', id: 'send', name: 'send', label: 'Send' },
			],
		},
	],
};

export function ContactForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
	return <FormRenderer engine={engine} config={contactConfig} onSubmit={onSubmit} />;
}
```

## Entry points

| Import                                       | Holds                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `@schema-engine/forms-radiant`               | `createRadiantFormEngine`, `FormRenderer`, `schemaFormRegistrations`, the recipes and the controllers |
| `@schema-engine/forms-radiant/index.css`     | The renderer's stylesheet                                                                             |
| `@schema-engine/forms-radiant/registrations` | Each element registration by name                                                                     |
| `@schema-engine/forms-radiant/primitives`    | `FormField`, `FormFieldElement`, `FormElement` and `ChildGrid`                                        |
| `@schema-engine/forms-radiant/hooks`         | Helpers for building elements                                                                         |
| `@schema-engine/forms-radiant/contexts`      | The contexts the hosts publish                                                                        |

## Documentation

- [Forms Radiant](https://schema-engine.com/docs/forms-radiant/overview): the elements, the engine factory and the controllers.
- [Installation and quick start](https://schema-engine.com/docs/forms-radiant/getting-started): the peers, the JSX setting and a form that submits.
- [Layouts](https://schema-engine.com/docs/forms-radiant/layouts): shells, wizard and appearance.
- [Form controls](https://schema-engine.com/docs/forms-radiant/form-controls): native events and custom controls.
- [Server rendering and engine binding](https://schema-engine.com/docs/forms-radiant/server-rendering): assign the engine to server-rendered forms.
- [API reference](https://schema-engine.com/docs/forms-radiant/api-reference).
- [For AI agents](https://schema-engine.com/docs/schema-engine/agent-skill): the package ships its part of the agent skill.

## License

MIT
