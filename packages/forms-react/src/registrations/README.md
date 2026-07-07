# Registration System

This directory contains grouped re-exports of component registrations with TypeScript module augmentation.

## How registration works

Each component ships a colocated registration file:

```
components/elements/inputs/
├── form-input.types.ts
├── form-input.tsx
└── form-input.registration.ts
```

The registration file:

1. augments `FormEngine.ElementRegistry` (or layout/stepper registries)
2. exports a registration object with `$type`, `render`, `schema`, and `metadata`

Importing a registration merges its types at compile time. Runtime registration still happens explicitly through `createReactFormComposer().addElement(...)`.

## Usage

### Individual imports (recommended)

```typescript
import { createReactFormComposer } from '@schema-engine/forms-react';
import { InputElementRegistration } from '@schema-engine/forms-react/registrations/elements';
import { CardLayoutRegistration } from '@schema-engine/forms-react/registrations/layouts';
import { DefaultStepperRegistration } from '@schema-engine/forms-react/registrations/stepper';

const engine = createReactFormComposer()
	.addElement(InputElementRegistration)
	.addLayout(CardLayoutRegistration)
	.addStepper(DefaultStepperRegistration)
	.build();
```

### Grouped element imports

```typescript
import {
	InputElementRegistration,
	TextareaElementRegistration,
	SelectElementRegistration,
} from '@schema-engine/forms-react/registrations/elements';
```

### Direct component imports

```typescript
import { InputElementRegistration } from '@schema-engine/forms-react/components/elements/inputs/form-input.registration';
```

### Default bundle

`registrations/default.ts` re-exports the common built-in set when you want a batteries-included engine.

## File organization

```
registrations/
├── README.md
├── default.ts
├── elements/
│   └── index.ts
├── layouts.ts
└── stepper.ts
```

Source components live under `src/components/elements/`, `src/components/layouts/`, and `src/components/steppers/`.

## Adding a new registration

1. Create `*.types.ts`, component, and `*.registration.ts` beside each other.
2. Re-export the registration from `registrations/elements/index.ts` (or layouts/stepper).
3. Add the global `FormEngine` augmentation in the registration file.

```typescript
declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'new-element': NewElementConfig;
		}
	}
}

export const NewElementRegistration = {
	$type: 'new-element',
	render: NewElement,
	schema: NewElementSchema,
	metadata: {
		name: 'New Element',
		description: 'Description of the new element',
		category: 'input',
	},
};
```

Registration schemas must implement [Standard Schema](https://standardschema.dev/). Use `InferConfig` from `@schema-engine/forms-react/lib/infer-config` for TypeScript output types.
