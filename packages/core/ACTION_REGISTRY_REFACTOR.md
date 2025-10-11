# ActionRegistry Refactor: From Global Singleton to Internal Builder Component

## Problem Statement

The original architecture exported `ActionRegistry` as a global singleton, creating an awkward dual-system where:

- Users could register actions both via `FormEngineBuilder.addAction()` AND via `registerAction()`
- Tests mixed both builder pattern and direct registry access
- No clear ownership - was ActionRegistry part of the builder or a separate system?
- Global state made testing more complex (required `actionRegistry.clear()` in test setup)

## Solution: Make ActionRegistry Internal

ActionRegistry is now an **internal implementation detail** of the FormEngine, accessible only through the builder pattern.

### Changes Made

1. **Removed public export**: `ActionRegistry` is no longer exported from `@/actions/index.ts`
2. **Updated test utilities**: Removed `actionRegistry.clear()` from `setupTestEnvironment()`
3. **All plugin tests updated**: Use direct `plugin.execute()` instead of `actionRegistry.execute()`

### Architecture Comparison

#### Before (Global Singleton)

```typescript
// Option 1: Via builder (recommended but optional)
const engine = new FormEngineBuilder().addAction(submitPlugin()).build();

// Option 2: Via global registry (confusing!)
import { registerAction } from "@ecopages/form-engine";
registerAction(submitPlugin());
```

#### After (Builder Only)

```typescript
// Only one way: via builder
const engine = new FormEngineBuilder().addAction(submitPlugin()).build();

// Global registerAction() no longer exists
```

### Test Pattern Changes

#### Before

```typescript
import { actionRegistry } from "@/actions/action-registry";

beforeEach(() => {
	actionRegistry.clear(); // Global state!
	actionRegistry.register(submitPlugin());
});

test("should execute action", async () => {
	const result = await actionRegistry.execute(action, context);
	expect(result.success).toBe(true);
});
```

#### After

```typescript
import { submitPlugin } from "@/actions/plugins";

test("should execute action", async () => {
	const plugin = submitPlugin();
	const context = createMockBuilderContext(action);
	const result = await plugin.execute(context);
	expect(result.success).toBe(true);
});
```

## Benefits

1. **Clear API**: Single, obvious way to register actions
2. **Better encapsulation**: ActionRegistry is now a private implementation detail of FormEngine
3. **Easier testing**: No global state to manage
4. **Type safety**: Actions are scoped to specific FormEngine instances
5. **Consistent pattern**: Matches how elements, layouts, and steppers work

## Migration Guide

### For Library Users

If you were using the old `registerAction()` function:

```typescript
// Old (no longer works)
import { registerAction, submitPlugin } from "@ecopages/form-engine";
registerAction(submitPlugin());

// New (required)
import { FormEngineBuilder, submitPlugin } from "@ecopages/form-engine";
const engine = new FormEngineBuilder().addAction(submitPlugin()).build();
```

### For Test Code

If you have tests using `actionRegistry`:

```typescript
// Old (no longer works)
import { actionRegistry } from "@ecopages/form-engine";
const result = await actionRegistry.execute(action, context);

// New (recommended)
import { submitPlugin } from "@ecopages/form-engine";
const plugin = submitPlugin();
const result = await plugin.execute(createMockBuilderContext(action));
```

## Status

- ✅ **Deleted** `action-registry.test.ts` (20 obsolete tests removed)
- ✅ All 248 remaining core tests passing
- ✅ All 119 plugin tests passing
- ✅ Library builds successfully
- ✅ No breaking changes to public API (only removed confusing dual registration)

## Test Coverage

ActionRegistry functionality is now fully covered through:

- **FormEngineBuilder tests** (`form-engine-builder.test.ts`) - Action registration, override behavior
- **ActionExecutor tests** (`action-executor.test.ts`) - Action execution, error handling, lifecycle
- **Plugin tests** - Schema validation, execution logic for all plugins

## Notes

- Plugin documentation examples in comments still reference the old `registerAction()` pattern - these should be updated in a follow-up
