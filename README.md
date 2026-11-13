# Schema Engine

> **A Schema-First Foundation for Modular Interfaces** — Build deterministic, type-safe, and event-driven systems from portable definitions.

> **Important:** This README is an overview, not the API reference. For copy-paste-ready examples and current contracts, use the [Documentation App](./apps/docs) — start with [Quick Start](./apps/docs/src/content/docs/getting-started/quick-start.mdx).

---

Forms and renderer runtime diagnostics use package-tagged `@ecopages/logger`
instances. Published forms expose action dispatch through `@schema-engine/forms/actions`;
see the [forms API](./packages/forms/README.md#pre-publish-api) for the supported
grid and recipe contracts. Debug output is disabled by default; warnings and errors remain visible.

## Why Schema Engine?

In modern software architecture, the layer between human intent and system behavior often remains a fragmented landscape of imperative logic and tightly coupled UI components.

**Schema Engine** establishes a new standard: **The Schema is the Single Source of Truth.**

While **Forms** are the most common application of this pattern, the same primitives can drive **Wizards**, **Dashboards**, **Kanban Boards**, and **Workflow Designers**. By treating interfaces as **structured capabilities** rather than just views, we enable a level of governance, velocity, and reliability that is impossible with ad-hoc component assembly.

---

## Core Concepts

We have distilled interface requirements into four core concepts that are completely domain-agnostic.

| Concept         | Role         | Description                                                                                 |
| --------------- | ------------ | ------------------------------------------------------------------------------------------- |
| **Registry**    | `Definition` | **IoC Container**. Decouples _what_ a component is from _how_ it renders (React, Vue, CLI). |
| **Action**      | `Behavior`   | **Command Pattern**. Handles system events and transitions state deterministically.         |
| **Constraint**  | `Logic`      | **Rule Engine**. Declarative rules that govern visibility and state without side effects.   |
| **Composition** | `Structure`  | **Recursive Assembly**. Builds complex systems from atomic, testable units.                 |

---

## Key Features by Example

### 1. End-to-End Type Fidelity

We reject the compromise between dynamic behavior and static analysis. Through advanced TypeScript inference, your runtime schema dictates your compile-time types.

```typescript
import { createFormEngine } from '@schema-engine/forms';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

const engine = createFormEngine({ elements: schemaFormRegistrations });
// Register schemaFormRecipeRegistrations when the form sets view.$type or has more than one step.

// Registered element types are inferred from createFormEngine options.
const myForm = {
	id: 'my-form',
	steps: [
		{
			id: 'step-1',
			elements: [
				{
					$type: 'input',
					name: 'username',
					label: 'Username',
					inputType: 'text',
					placeholder: 'Enter name',
				},
			],
		},
	],
};
```

### 2. Declarative Constraints

Complex logic (show/hide, enable/disable) typically leads to unmaintainable "spaghetti code" in UI components. We elevate this logic into **Constraints**—declarative rules evaluated by a central engine.

**Example: Conditional Visibility**
Show the "State" field only when "Country" is "US".

```typescript
{
  $type: 'select',
  name: 'country',
  label: 'Country',
  options: [{ label: 'United States', value: 'US' }, { label: 'Canada', value: 'CA' }]
},
{
  $type: 'select',
  name: 'state',
  label: 'State',
  // This field is hidden by default until the constraint is met
  constraints: [
    {
      field: 'country',
      operator: 'equals',
      value: 'US',
      action: 'show'
    }
  ]
}
```

### 3. Event-Driven Actions

Forms are dynamic systems. We model interactivity not as callbacks, but as discrete **Actions** triggered by events. This separates business logic from presentation.

**Example: Custom Submission Action**

```typescript
const submitLeadAction = {
	$type: 'submit_lead',
	schema: z.object({ endpoint: z.string() }),
	metadata: { name: 'Submit Lead' },
	execute: async (context) => {
		const result = await fetch(context.config.endpoint, {
			method: 'POST',
			body: JSON.stringify(context.formData),
		});
		return { success: result.ok };
	},
};

// Register with createFormEngine, then reference in form config actions array.
```

---

## System Architecture

The Schema Engine monorepo is organized as a layered architecture, moving from abstract definitions to concrete implementations.

```mermaid
graph TD
    subgraph Core ["Core Abstractions"]
        Registry["@schema-engine/registry<br/>(Core: IoC & Types)"]
        Actions["@schema-engine/actions<br/>(Core: Event System)"]
        Layout["@schema-engine/layout<br/>(Core: Grid, Appearance & Recipes)"]
    end

    subgraph Implementation ["Implementation Layer"]
        Forms["@schema-engine/forms<br/>(Form Engine Implementation)"]
    end

    subgraph Presentation ["Presentation Layer"]
        React["@schema-engine/forms-react<br/>(React Adapters)"]
    end

    Registry --> Actions
    Registry --> Layout
    Registry --> Forms
    Actions --> Forms
    Layout --> Forms
    Forms --> React
```

---

## 📦 Packages

| Package                                                      | Version | Description                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[@schema-engine/forms](./packages/forms)**                 | `0.1.0` | Contains `createFormEngine` and `FormEngine`. Types form configurations from each engine's element, recipe, and action registrations; handles validation, constraint evaluation, and state management.                                                                                                                                                                                                                                               |
| **[@schema-engine/forms-react](./packages/forms-react)**     | `0.1.0` | React rendering at the root, runtime and view hooks at `/hooks`, adapter contracts and hooks at `/adapters`, and rendering primitives at `/primitives`. The optional React Hook Form adapter lives at `/adapters/react-hook-form`; elements and recipes are consumer-owned. A new normalized config starts a fresh form instance; the React Hook Form adapter resets to initial field values. Default recipes live in the shadcn registry.           |
| **[@schema-engine/forms-radiant](./packages/forms-radiant)** | `0.1.0` | Radiant/JSX adapter with hydrated registry validation, shared per-engine lifecycle actions, nested submit values, SSR constraints evaluated against defaults, authored disabled preservation, scoped form and engine controllers, optional decorators, array-level validation, initial row values, SSR default rows, and stable field-array row IDs. Binds canonical view recipes in-package; specs stay in `@schema-engine/forms/recipes/built-in`. |
| **[@schema-engine/actions](./packages/actions)**             | `0.1.0` | A standalone, domain-agnostic command pattern implementation for handling system events.                                                                                                                                                                                                                                                                                                                                                             |
| **[@schema-engine/registry](./packages/registry)**           | `0.1.0` | The low-level type definitions and registry implementations that power the IoC container.                                                                                                                                                                                                                                                                                                                                                            |
| **[@schema-engine/layout](./packages/layout)**               | `0.1.0` | Domain-neutral layout: the grid schemas and compiler, named placement, appearance axes (`defineAxis`), `createLayoutTheme`, which compiles both into one theme with one `data-se-theme` and one stylesheet (engines take it as `layout`), and the recipe protocol (`defineRecipeProtocol`) a domain uses to declare its recipes' slots, kinds and rules. It does not depend on forms.                                                                |

---

## 🚀 Quick Start

See the full walkthrough in [Quick Start](./apps/docs/src/content/docs/getting-started/quick-start.mdx). Minimal verified setup:

```bash
pnpm add @schema-engine/forms @schema-engine/forms-react @schema-engine/layout react react-dom react-hook-form zod
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-form andeeplus/schema-engine/schema-engine-form-recipes
```

Import the recipe styles once in your global stylesheet, after Tailwind. The path is relative to that stylesheet (`./components/...` from a Vite `src/index.css`, `../components/...` from a Next.js `app/globals.css`):

```css
@import 'tailwindcss';
@import './components/schema-engine/forms/recipes/recipes.css' layer(components);
```

```typescript
import { createFormEngine } from '@schema-engine/forms';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

const engine = createFormEngine({
	elements: schemaFormRegistrations,
	recipes: schemaFormRecipeRegistrations,
});

const contactFormSchema = {
	id: 'contact-form',
	title: 'Contact Sales',
	view: { $type: 'card', shell: { appearance: { size: 'default' } } },
	steps: [
		{
			id: 'step-1',
			elements: [
				{
					$type: 'input',
					name: 'company_name',
					label: 'Company Name',
					inputType: 'text',
					rules: [{ type: 'required' }],
				},
				{
					$type: 'input',
					name: 'business_email',
					label: 'Business Email',
					inputType: 'email',
					rules: [{ type: 'required' }, { type: 'email' }],
				},
			],
		},
	],
	actions: [{ $type: 'submit', id: 'submit_lead', endpoint: '/api/v1/leads' }],
};
```

```tsx
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';

export function ContactPage() {
	return (
		<FormEngineProvider engine={engine} adapter={rhfAdapter}>
			<FormRenderer config={contactFormSchema} onSubmit={(data) => console.log('Payload:', data)} />
		</FormEngineProvider>
	);
}
```

---

## 📚 Documentation

Detailed architectural documentation is available in the [Documentation App](./apps/docs).

- **[Quick Start](./apps/docs/src/content/docs/getting-started/quick-start.mdx)**
- **[Forms — Core Concepts](./apps/docs/src/content/docs/forms/core-concepts.mdx)**
- **[Component Registry](./apps/docs/src/content/docs/registry/overview.mdx)**
- **[shadcn Registry Sources](./registry/README.md)**
- **[Action System](./apps/docs/src/content/docs/actions/overview.mdx)**
- **[Forms React — Getting Started](./apps/docs/src/content/docs/forms-react/getting-started.mdx)**

---

## 📄 License

MIT © Schema Engine Contributors

The [registry package](./packages/registry/README.md) exposes `createRegistry`, the
read-only registry the forms engine and actions package use, `BaseRegistry` as the
mutable opt-in for runtime plugins, and the registration types. Action sequences support concurrent groups and cooperative cancellation; the [actions package](./packages/actions/README.md)
executes through `ActionDispatcher`; form-specific redirect results are described
in the [forms action guide](./packages/forms/src/actions/README.md).

The [React adapter](./packages/forms-react/README.md#validation-navigation-and-action-contexts)
uses the engine's shared validation, navigation, submission and action context
contracts, including nested errors and conditional required fields.

Radiant forms share the engine step and submission lifecycle, refresh form snapshots for each submit trigger, publish nested provider callbacks, and serialize full config once per instance. See [Radiant rendering](./packages/forms-radiant/README.md#rendering-architecture).
