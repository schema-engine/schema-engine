# Explicit Module Augmentation Refactor Proposal

## Goal

Move from implicit (import-based) module augmentation to explicit user-controlled type registration.

## Changes Required

### 1. Create Central Type Registry

**File:** `packages/core/src/types/registry.ts`

````typescript
/**
 * Global FormEngine Type Registry
 *
 * This is the single source of truth for all extensible types.
 * Users must explicitly augment these interfaces to register custom types.
 *
 * @example Basic Usage
 * ```typescript
 * import type { MyCustomAction } from './my-plugin';
 *
 * declare global {
 *   namespace FormEngine {
 *     interface ActionRegistry {
 *       my_action: MyCustomAction;
 *     }
 *   }
 * }
 * ```
 */
declare global {
	namespace FormEngine {
		/**
		 * Element/Field configuration registry
		 * Register field types here for use in form configurations
		 */
		interface ElementRegistry {}

		/**
		 * Action configuration registry
		 * Register action types here for use in form configurations
		 */
		interface ActionRegistry {}

		/**
		 * Layout configuration registry
		 * Register layout types here for use in form configurations
		 */
		interface LayoutRegistry {}

		/**
		 * Stepper configuration registry
		 * Register stepper types here for use in form configurations
		 */
		interface StepperRegistry {}

		// Derived union types
		type ElementConfig = ElementRegistry[keyof ElementRegistry];
		type ActionConfig = ActionRegistry[keyof ActionRegistry];
		type LayoutConfig = LayoutRegistry[keyof LayoutRegistry];
		type StepperConfig = StepperRegistry[keyof StepperRegistry];

		// Helper types
		type ElementId = keyof ElementRegistry;
		type id = keyof ActionRegistry;
		type id = keyof LayoutRegistry;
		type id = keyof StepperRegistry;
	}
}

export {};
````

---

### 2. Remove Auto-Augmentation from Plugins

**Before (submit-plugin.ts):**

```typescript
// Module augmentation to add submit action to PluginActions
declare module "../types" {
	interface PluginActions {
		submit: SubmitAction;
	}
}

export function submitPlugin(config: SubmitPluginConfig) {
	// ... implementation
}
```

**After (submit-plugin.ts):**

```typescript
// NO automatic augmentation!
// Users must register the type themselves

export function submitPlugin(config: SubmitPluginConfig) {
	// ... implementation
}

// Export the type for users to register
export type SubmitAction = z.infer<typeof SubmitActionSchema>;
```

---

### 3. Provide Pre-Built Type Registration Files

For convenience, provide ready-to-import augmentation files:

**File:** `packages/core/src/registrations/action-types.ts`

````typescript
/**
 * Pre-configured action type registrations
 *
 * Import this file to register all built-in action types.
 * This is the recommended approach for most users.
 *
 * @example
 * ```typescript
 * import '@json-form-engine/core/registrations/action-types';
 * ```
 */
import type {
	SubmitAction,
	ResetAction,
	NotificationAction,
	AutoSaveAction,
	GTMEventAction,
} from "../actions/plugins";

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: SubmitAction;
			reset: ResetAction;
			show_notification: NotificationAction;
			auto_save: AutoSaveAction;
			gtm_event: GTMEventAction;
		}
	}
}

export {};
````

**File:** `packages/react/src/registrations/element-types.ts`

````typescript
/**
 * Pre-configured element type registrations for React
 *
 * Import this file to register all built-in React field types.
 *
 * @example
 * ```typescript
 * import '@json-form-engine/react/registrations/element-types';
 * ```
 */
import type {
	InputFieldConfig,
	TextareaFieldConfig,
	CheckboxFieldConfig,
	NumberFieldConfig,
	RadioFieldConfig,
	SelectFieldConfig,
	SwitchFieldConfig,
	ArrayElementsConfig,
} from "../components/form/fields";

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			input: InputFieldConfig;
			textarea: TextareaFieldConfig;
			checkbox: CheckboxFieldConfig;
			number: NumberFieldConfig;
			radio: RadioFieldConfig;
			select: SelectFieldConfig;
			switch: SwitchFieldConfig;
			arrayElements: ArrayElementsConfig;
		}
	}
}

export {};
````

---

### 4. Update Documentation

**File:** `packages/core/README.md`

Add section:

```markdown
## Type Registration

FormEngine uses explicit type registration for full type safety and predictability.

### Quick Start (Recommended)

Import pre-configured types:

\`\`\`typescript
// Register all built-in types at once
import '@json-form-engine/core/registrations/action-types';
import '@json-form-engine/react/registrations/element-types';
import '@json-form-engine/react/registrations/layout-types';
import '@json-form-engine/react/registrations/stepper-types';

// Now use with full type safety
const formConfig: FormConfig = {
actions: [
{ type: 'submit', ... } // ✅ Type-safe
]
};
\`\`\`

### Custom Registration (Advanced)

Register only what you need:

\`\`\`typescript
import type { SubmitAction, ResetAction } from '@json-form-engine/core/actions';

declare global {
namespace FormEngine {
interface ActionRegistry {
submit: SubmitAction;
reset: ResetAction;
// Don't need notification, auto-save, or gtm? Don't register them!
}
}
}
\`\`\`

### Third-Party Plugins

\`\`\`typescript
import { myCustomPlugin, type MyCustomAction } from '@company/form-plugins';

// Explicitly register the type
declare global {
namespace FormEngine {
interface ActionRegistry {
my_custom: MyCustomAction;
}
}
}

// Use with runtime registration
const engine = new FormEngineBuilder()
.addAction(myCustomPlugin())
.build();
\`\`\`
```

---

### 5. Migration Guide for Existing Users

**File:** `packages/core/MIGRATION_EXPLICIT_TYPES.md`

```markdown
# Migration Guide: Explicit Type Registration

## What Changed?

Previously, importing a plugin automatically registered its types globally (implicit augmentation).
Now, you must explicitly register types for full type safety (explicit augmentation).

## Why?

- **Predictability:** Types match what you actually use
- **Debuggability:** Clear what types are available
- **Tree-shaking:** Only bundle types you need
- **Team clarity:** Self-documenting code

## How to Migrate

### Before (v2.0)

\`\`\`typescript
import { submitPlugin } from '@json-form-engine/core/actions';
// Types were automatically available (magic!)
\`\`\`

### After (v2.1)

\`\`\`typescript
// Option 1: Use pre-configured (easiest)
import '@json-form-engine/core/registrations/action-types';
import { submitPlugin } from '@json-form-engine/core/actions';

// Option 2: Cherry-pick (advanced)
import type { SubmitAction } from '@json-form-engine/core/actions';
declare global {
namespace FormEngine {
interface ActionRegistry {
submit: SubmitAction;
}
}
}
\`\`\`

### One-Line Fix for Most Projects

Add this to your main entry file:

\`\`\`typescript
// src/main.ts or src/App.tsx
import '@json-form-engine/core/registrations/action-types';
import '@json-form-engine/react/registrations/element-types';
import '@json-form-engine/react/registrations/layout-types';
import '@json-form-engine/react/registrations/stepper-types';
\`\`\`

Done! Everything works as before, but now it's explicit.
```

---

## Implementation Steps

1. ✅ Create `packages/core/src/types/registry.ts`
2. ✅ Create `packages/core/src/registrations/action-types.ts`
3. ✅ Create `packages/react/src/registrations/element-types.ts`
4. ✅ Create `packages/react/src/registrations/layout-types.ts`
5. ✅ Create `packages/react/src/registrations/stepper-types.ts`
6. ✅ Remove all `declare module` from plugin files
7. ✅ Update `packages/core/src/actions/types.ts` to use `FormEngine.ActionRegistry`
8. ✅ Update `packages/core/src/schemas/field-config.ts` to use `FormEngine.ElementRegistry`
9. ✅ Update exports in `packages/core/src/index.ts`
10. ✅ Update exports in `packages/react/src/index.ts`
11. ✅ Update all documentation
12. ✅ Update tests
13. ✅ Update www app to use explicit registration
14. ✅ Test build and type checking

---

## Benefits Summary

| Benefit              | Description                                 |
| -------------------- | ------------------------------------------- |
| **Clarity**          | Code shows exactly what types are available |
| **Predictability**   | No import-order surprises                   |
| **Debuggability**    | Easy to trace where types come from         |
| **Performance**      | Better tree-shaking possibilities           |
| **Safety**           | Runtime and types stay in sync              |
| **Documentation**    | Type declarations are self-documenting      |
| **Enterprise-ready** | Teams can audit what's registered           |

---

## Recommendation

**Proceed with this refactor.** The benefits far outweigh the migration cost, and your instinct about "scary magic" is 100% correct. Explicit is better than implicit, especially for a library that aims to be production-grade.
