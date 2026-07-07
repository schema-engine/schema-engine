# Form Elements

Built-in field and action components for `@schema-engine/forms-react`. Inputs wrap primitives from `components/core-ui/` and connect to the active form adapter (React Hook Form by default).

## Available elements

**Inputs:** `input`, `textarea`, `number`, `select`, `radio`, `checkbox`, `checkbox-group`, `switch`, `slider`, `input-otp`, `combobox`, `phone-input`, `drop-zone`, `array`, `fieldset`

**Actions:** `submit`

## Quick start

### Manual registration

```typescript
import { createReactFormComposer } from '@schema-engine/forms-react';
import {
	InputElementRegistration,
	TextareaElementRegistration,
	CheckboxGroupElementRegistration,
} from '@schema-engine/forms-react/registrations/elements';

const engine = createReactFormComposer()
	.addElement(InputElementRegistration)
	.addElement(TextareaElementRegistration)
	.addElement(CheckboxGroupElementRegistration)
	.build();
```

### Example `FormConfig`

```typescript
import type { FormConfig } from '@schema-engine/forms';

const formConfig: FormConfig = {
	id: 'contact',
	title: 'Contact',
	steps: [
		{
			id: 'main',
			title: 'Details',
			elements: [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [{ type: 'required', message: 'Email required' }],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rows: 5,
				},
				{
					$type: 'checkbox-group',
					id: 'interests',
					name: 'interests',
					label: 'Interests',
					options: [
						{ value: 'sports', label: 'Sports' },
						{ value: 'music', label: 'Music' },
					],
				},
			],
		},
	],
};
```

## Documentation

- [Input elements](./inputs/README.md)
- [Action elements](./actions/README.md)

## Features

- Standard Schema registration configs (`schema` on each registration)
- Adapter-driven field state (`useAdapterControlledFormElement`)
- Constraint logic via `useConstraintLogic`
- Grid layout support through form-level `grid` config

## See also

- [Package README](../../../README.md)
- [@schema-engine/forms validation docs](../../../../forms/README.md#validation)
