# Module Augmentation Strategy Analysis

## Current State

All component categories (elements, actions, layouts, steppers) need TypeScript type registration because they're all **serializable** in the form configuration JSON.

## The Two Approaches

### Approach A: Implicit Augmentation (Current - Scary Magic)

**How it works:**

```typescript
// In plugin file: submit-plugin.ts
export const submitPlugin = () => {
	/* ... */
};

// Module augmentation happens automatically on import
declare module "../types" {
	interface PluginActions {
		submit: SubmitAction;
	}
}

// User code - just imports
import { submitPlugin } from "@json-form-engine/core/actions";
// ✨ Magic: PluginActions is now augmented with 'submit'
```

**Pros:**

- ✅ Convenient - "just import and it works"
- ✅ No boilerplate for users
- ✅ Follows TypeScript conventions (like `@types/*` packages)

**Cons:**

- ❌ **MAGICAL** - Types change based on imports (implicit side effects)
- ❌ **UNPREDICTABLE** - Import order matters but isn't obvious
- ❌ **TREE-SHAKING ISSUES** - Can't shake unused augmentations
- ❌ **DEBUGGING NIGHTMARE** - "Why is this type available here but not there?"
- ❌ **IDE CONFUSION** - Autocomplete shows types that might not actually be available
- ❌ **HIDDEN DEPENDENCIES** - Types are coupled to import side effects

**Example Problem:**

```typescript
// File A - imports submit plugin
import { submitPlugin } from "@json-form-engine/core/actions";

type MyAction = FormActionConfig;
// ✅ Has 'submit' in union

// File B - doesn't import submit plugin
type MyAction = FormActionConfig;
// ❌ Doesn't have 'submit' in union (but IDE might show it!)
```

---

### Approach B: Explicit Registration (Recommended - Clear & Predictable)

**How it works:**

```typescript
// In plugin file: submit-plugin.ts
export const submitPlugin = () => {
	/* ... */
};

// NO automatic augmentation

// User code - EXPLICIT registration
import { FormEngineBuilder } from "@json-form-engine/core/builder";
import { submitPlugin, type SubmitAction } from "@json-form-engine/core/actions";

// Option B1: Manual augmentation (user's responsibility)
declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: SubmitAction;
		}
	}
}

const engine = new FormEngineBuilder()
	.addAction(
		submitPlugin({
			/* ... */
		})
	)
	.build();

// Option B2: Builder method does augmentation
const engine = new FormEngineBuilder()
	.registerid<"submit", SubmitAction>() // Explicit type registration
	.addAction(
		submitPlugin({
			/* ... */
		})
	) // Runtime registration
	.build();
```

**Pros:**

- ✅ **EXPLICIT** - You see exactly what types are available
- ✅ **PREDICTABLE** - No import order issues
- ✅ **DEBUGGABLE** - Clear cause and effect
- ✅ **SELF-DOCUMENTING** - Code shows what's available
- ✅ **IDE ACCURATE** - Autocomplete matches reality
- ✅ **TREE-SHAKEABLE** - Only register what you use

**Cons:**

- ❌ More boilerplate for users
- ❌ Two-step process (type registration + runtime registration)
- ❌ Can forget to register types (runtime works but no type safety)

---

## Hybrid Approach (Best of Both Worlds?)

### Approach C: Explicit with Helper

**How it works:**

```typescript
// Plugin provides both runtime and type registration
export const submitPlugin = () => {
	/* runtime logic */
};

export function registerSubmitid() {
	// This could be a type-only function that forces augmentation
	return null as any as Registerid<"submit", SubmitAction>;
}

// Or use a builder method that does both
const engine = new FormEngineBuilder()
	.addActionPlugin(
		submitPlugin({
			// Automatically registers both runtime AND type
			onSuccess: (data) => console.log(data),
		})
	)
	.build();
```

**Implementation:**

```typescript
// In FormEngineBuilder
addActionPlugin<TType extends string, TConfig>(
  plugin: ActionPlugin<TType, TConfig>
): FormEngineBuilder<
  TElements,
  TLayouts,
  TSteppers,
  TActions & Record<TType, TConfig>  // Type registration happens here
> {
  // Runtime registration
  this.actions.set(plugin.id, plugin);
  return this as any;
}
```

**Pros:**

- ✅ Explicit (one call does both)
- ✅ Predictable (type and runtime stay in sync)
- ✅ Less boilerplate than fully manual
- ✅ Type-safe builder API

**Cons:**

- ❌ Still some magic (generic inference)
- ❌ More complex builder implementation

---

## Real-World Scenarios

### Scenario 1: Third-party Plugin Package

```typescript
// Package: @company/custom-form-actions
export const slackNotificationPlugin = () => {
	/* ... */
};
export type SlackNotificationAction = {
	/* ... */
};
```

**With Approach A (Implicit):**

```typescript
// User just imports
import { slackNotificationPlugin } from "@company/custom-form-actions";
// Magic: Now SlackNotificationAction is in global types
```

**Problem:** User has no idea this happened. Debugging is hell.

**With Approach B (Explicit):**

```typescript
import {
	slackNotificationPlugin,
	type SlackNotificationAction,
} from "@company/custom-form-actions";

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			slack_notification: SlackNotificationAction;
		}
	}
}

const engine = new FormEngineBuilder().addAction(slackNotificationPlugin()).build();
```

**Better:** Clear what's registered. Searchable. Debuggable.

---

### Scenario 2: Conditional Registration

**With Approach A:**

```typescript
// Uh oh - types are global even if not used!
if (config.enableSlack) {
	import("./slack-plugin"); // Types leak globally
}
```

**With Approach B:**

```typescript
if (config.enableSlack) {
  const { slackPlugin, type SlackAction } = await import('./slack-plugin');

  declare global {
    namespace FormEngine {
      interface ActionRegistry {
        slack: SlackAction;
      }
    }
  }

  builder.addAction(slackPlugin());
}
// Types only exist when actually used
```

---

## My Recommendation

### Use **Approach B (Explicit)** with Quality-of-Life Helpers

**Rationale:**

1. Your form engine is a **serious, production-grade tool**
2. Debugging user issues will be a nightmare with implicit augmentation
3. Enterprise users NEED predictability over convenience
4. Clear is better than clever (Zen of Python applies here)

**Implementation Plan:**

```typescript
// 1. Remove all automatic augmentation from plugin files
// 2. Centralize type registry in one place
// packages/core/src/types/registry.ts
declare global {
	namespace FormEngine {
		interface ElementRegistry {}
		interface ActionRegistry {}
		interface LayoutRegistry {}
		interface StepperRegistry {}

		type ElementConfig = ElementRegistry[keyof ElementRegistry];
		type ActionConfig = ActionRegistry[keyof ActionRegistry];
		type LayoutConfig = LayoutRegistry[keyof LayoutRegistry];
		type StepperConfig = StepperRegistry[keyof StepperRegistry];
	}
}

// 3. Provide pre-configured augmentation file for convenience
// packages/core/src/registrations/types.ts
import type { SubmitAction, ResetAction, NotificationAction } from "../actions/plugins";

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: SubmitAction;
			reset: ResetAction;
			show_notification: NotificationAction;
		}
	}
}

// 4. Users can either:
// Option A - Use pre-configured (most common)
import "@json-form-engine/core/registrations/types";

// Option B - Cherry-pick (advanced)
import type { SubmitAction } from "@json-form-engine/core/actions";
declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: SubmitAction;
		}
	}
}
```

---

## Decision Matrix

| Criteria             | Implicit (A) | Explicit (B) | Hybrid (C) |
| -------------------- | ------------ | ------------ | ---------- |
| **Ease of Use**      | ⭐⭐⭐       | ⭐⭐         | ⭐⭐⭐     |
| **Predictability**   | ⭐           | ⭐⭐⭐       | ⭐⭐       |
| **Debuggability**    | ⭐           | ⭐⭐⭐       | ⭐⭐       |
| **Tree-shaking**     | ⭐           | ⭐⭐⭐       | ⭐⭐       |
| **Type Safety**      | ⭐⭐         | ⭐⭐⭐       | ⭐⭐⭐     |
| **Maintainability**  | ⭐           | ⭐⭐⭐       | ⭐⭐       |
| **User Experience**  | ⭐⭐⭐       | ⭐⭐         | ⭐⭐⭐     |
| **Enterprise Ready** | ⭐           | ⭐⭐⭐       | ⭐⭐       |

## My Strong Opinion

Go with **Explicit (B)** because:

1. **"Scared me a bit"** - Your instinct is RIGHT. Magic === bugs
2. **Serialization requirement** - Since everything is serializable, you NEED clear type boundaries
3. **Team collaboration** - Explicit is infinitely better for teams
4. **Future you will thank you** - When debugging a production issue at 2am
5. **Documentation writes itself** - The augmentation declarations ARE the documentation

Yes, it's more boilerplate. But it's **good boilerplate** - the kind that makes your code self-documenting and bulletproof.
