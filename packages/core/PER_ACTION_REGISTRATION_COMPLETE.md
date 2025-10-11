# Per-Action Registration Pattern - Implementation Complete

## What Changed

We've successfully implemented **per-action registration files** that match the pattern used for elements/fields. This provides explicit, predictable type augmentation.

## File Structure

```
packages/core/src/actions/plugins/
├── submit-plugin.ts              # Plugin factory (no auto-augmentation)
├── submit-registration.ts        # ✨ Pre-configured + type augmentation
├── notification-plugin.ts         # Plugin factory
├── notification-registration.ts   # ✨ Pre-configured + type augmentation
├── reset-plugin.ts               # Plugin factory
├── reset-registration.ts         # ✨ Pre-configured + type augmentation
├── auto-save-plugin.ts           # Plugin factory
├── auto-save-registration.ts     # ✨ Pre-configured + type augmentation
├── gtm-plugin.ts                 # Plugin factory
├── gtm-registration.ts           # ✨ Pre-configured + type augmentation
├── registrations.ts              # Re-exports all registrations
└── index.ts                      # Exports everything
```

## Usage Patterns

### Pattern 1: Use Pre-configured Registration (Recommended)

**Automatic type augmentation on import:**

```typescript
import { SubmitActionRegistration } from "@json-form-engine/core/actions/plugins/submit-registration";
import { FormEngineBuilder } from "@json-form-engine/core/builder";

// ✅ Type is automatically registered via global namespace augmentation
// ✅ Pre-configured with console logging

const engine = new FormEngineBuilder().addAction(SubmitActionRegistration).build();
```

### Pattern 2: Custom Configuration

**Use plugin factory with manual type registration:**

```typescript
import { submitPlugin } from "@json-form-engine/core/actions/plugins/submit-plugin";
import type { SubmitAction } from "@json-form-engine/core/actions/plugins/submit-plugin";
import { FormEngineBuilder } from "@json-form-engine/core/builder";

// Manually register the type
declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: SubmitAction;
		}
	}
}

// Use plugin factory with custom config
const engine = new FormEngineBuilder()
	.addAction(
		submitPlugin({
			onSuccess: (data) => myCustomSuccessHandler(data),
			onError: (error) => myCustomErrorHandler(error),
		})
	)
	.build();
```

### Pattern 3: Type Registration Only (Advanced)

**Register types without using the runtime registration:**

```typescript
// Just import for type augmentation, don't use the registration object
import "@json-form-engine/core/actions/plugins/submit-registration";

// Now FormEngine.ActionRegistry includes 'submit'
// But you can provide your own runtime registration
```

## How It Works

### Registration File Structure

Each `*-registration.ts` file follows this pattern:

```typescript
// 1. Import the plugin factory and type
import { submitPlugin } from "./submit-plugin";
import type { SubmitAction } from "./submit-plugin";

// 2. Augment the global namespace
declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: SubmitAction;
		}
	}
}

// 3. Export a pre-configured instance
export const SubmitActionRegistration = submitPlugin({
	// Default configuration
	onSuccess: (data, context) => {
		console.log("[Submit] Success:", { formId: context.formId, data });
	},
	onError: (error, context) => {
		console.error("[Submit] Error:", { formId: context.formId, error });
	},
});
```

### Type System

```typescript
// In types.ts
declare global {
	namespace FormEngine {
		interface ActionRegistry {}
		// Users augment this interface
	}
}

// Union of all registered actions
export type FormActionConfig = FormEngine.ActionRegistry[keyof FormEngine.ActionRegistry];
```

## Benefits

### 1. Explicit & Predictable

- **See exactly what's registered** - No hidden magic
- **Import === Registration** - Clear cause and effect
- **Type safety guaranteed** - Runtime and types stay in sync

### 2. Follows Existing Pattern

- **Matches elements/fields** - Consistent across codebase
- **Matches layouts/steppers** - Same pattern everywhere
- **Familiar to users** - Learn once, use everywhere

### 3. Tree-Shakeable

- **Import only what you need** - Better bundle size
- **No bulk augmentation** - Precise control
- **Dead code elimination** - Unused actions don't affect types

### 4. Debuggable

- **Greppable** - Can find where types come from
- **No action at a distance** - Explicit registration
- **Clear dependencies** - No side effect surprises

## Migration Guide

### Before (Implicit Augmentation)

```typescript
import { submitPlugin } from "@json-form-engine/core/actions";
// ❌ Types were magically available (scary!)
```

### After (Explicit Registration)

```typescript
// Option A: Use pre-configured (easiest)
import { SubmitActionRegistration } from "@json-form-engine/core/actions/plugins/submit-registration";
// ✅ Types registered explicitly on import

// Option B: Custom config with manual registration
import { submitPlugin, type SubmitAction } from "@json-form-engine/core/actions";
declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: SubmitAction;
		}
	}
}
```

## Example: www App

```typescript
// apps/www/src/lib/form-engine-setup.ts

/**
 * Type Registration Imports
 * These provide global type augmentation via module side effects.
 */
// biome-ignore lint/correctness/noUnusedImports: Required for type augmentation
import { SubmitActionRegistration } from "@json-form-engine/core/actions/plugins/submit-registration";
// biome-ignore lint/correctness/noUnusedImports: Required for type augmentation
import { NotificationActionRegistration } from "@json-form-engine/core/actions/plugins/notification-registration";
// ... etc

// Now we can use custom configurations
import { submitPlugin, notificationPlugin } from "@json-form-engine/core/actions";

export const formEngine = createReactFormEngine()
	.addAction(
		submitPlugin({
			// Custom configuration
			onSuccess: (data) => toast.success("Form submitted!"),
		})
	)
	.build();
```

## Comparison with Other Categories

| Category     | Registration File                                           | Type Augmentation          | Import Pattern                        |
| ------------ | ----------------------------------------------------------- | -------------------------- | ------------------------------------- |
| **Elements** | `form-input.ts` → exports `InputElement`                    | In `registrations.ts`      | Import element → type registered      |
| **Layouts**  | `card-layout.ts` → exports `CardLayoutRegistration`         | In `registrations.ts`      | Import layout → type registered       |
| **Steppers** | `default-stepper.ts` → exports `DefaultStepperRegistration` | In `registrations.ts`      | Import stepper → type registered      |
| **Actions**  | `submit-plugin.ts` + `submit-registration.ts`               | In `-registration.ts` file | Import registration → type registered |

All four categories now follow the same explicit pattern! 🎉

## Advantages Over Previous Approach

### Old Way (Scary Magic)

```typescript
// In plugin file
declare module "../types" {
	interface PluginActions {
		submit: SubmitAction;
	}
}
// ❌ Augmentation happens automatically on any import
// ❌ Hard to debug
// ❌ Hidden dependencies
```

### New Way (Explicit Control)

```typescript
// In registration file
declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: SubmitAction;
		}
	}
}
// ✅ Augmentation only when registration file is imported
// ✅ Easy to debug (grep for the import)
// ✅ Explicit dependencies
```

## Next Steps

1. ✅ Remove auto-augmentation from plugin files
2. ✅ Create per-action registration files
3. ✅ Update types.ts to use FormEngine.ActionRegistry
4. ✅ Update www app to use new pattern
5. ✅ Build and verify
6. 📝 Update documentation
7. 📝 Create migration guide for users

## Conclusion

This refactor brings **consistency, predictability, and clarity** to the action registration system. It matches the pattern used for elements/layouts/steppers and removes the "scary magic" of automatic module augmentation.

The explicit import-to-register pattern makes the codebase more maintainable and easier to understand for both library maintainers and users.
