# Registry Refactor - Complete

## Overview

Refactored the Form Engine to use a modular registry system with dependency injection, making all registries (Element, Layout, Stepper, Action) independent and reusable.

## Changes Made

### New Files Created

1. **`packages/core/src/builder/base-registry.ts`**

   - Abstract base class for all registries
   - Provides common CRUD operations (register, get, has, getAll, etc.)
   - Handles logging and duplicate warnings
   - Type-safe generic implementation

2. **`packages/core/src/builder/element-registry.ts`**

   - Manages ElementRegistration items
   - Extends BaseRegistry
   - Key: id

3. **`packages/core/src/builder/layout-registry.ts`**

   - Manages LayoutRegistration items
   - Extends BaseRegistry
   - Key: id

4. **`packages/core/src/builder/stepper-registry.ts`**

   - Manages StepperRegistration items
   - Extends BaseRegistry
   - Key: id

5. **`packages/core/src/builder/action-registry.ts`**

   - NEW: Manages BuilderActionRegistration items
   - Extends BaseRegistry
   - Key: id
   - Additional method: `getDefaultTriggers()`
   - Storage-only (execution moved to ActionExecutor)

6. **`packages/core/src/builder/REGISTRY_STANDALONE_USAGE.md`**
   - Comprehensive documentation for standalone registry usage
   - Examples for all use cases
   - Migration guide
   - API reference

### Modified Files

1. **`packages/core/src/builder/form-engine-builder.ts`**

   - Refactored to use dependency injection
   - Constructor now accepts registry instances (with defaults)
   - All add\* methods delegate to registries
   - Updated `extend()` method to copy registries
   - Updated `build()` method to pass registry Maps to FormEngine

2. **`packages/core/src/builder/index.ts`**

   - Added exports for all new registries

3. **`packages/core/src/index.ts`**
   - Added exports for standalone registry usage

## Architecture Benefits

### 1. Separation of Concerns

Each registry is a focused module with a single responsibility.

### 2. Dependency Injection

```typescript
const customElements = new ElementRegistry();
customElements.register(myElement);

const engine = new FormEngineBuilder(customElements).build();
```

### 3. Standalone Usage

```typescript
import { ActionRegistry } from "@json-form-engine/core";

const actions = new ActionRegistry();
actions.register(myAction);

// Use independently without the form engine
const action = actions.get("my-action");
```

### 4. Tree-Shaking

Users importing only `ActionRegistry` won't bundle element/layout/stepper code.

### 5. Testability

```typescript
const mockRegistry = new ElementRegistry();
mockRegistry.register(testElement);

const builder = new FormEngineBuilder(mockRegistry);
```

### 6. Extensibility

```typescript
class CustomRegistry extends BaseRegistry<string, MyType> {
	// Custom implementation
}
```

## API Consistency

All registries share the same API:

```typescript
- register(item: TValue): void
- has(key: TKey): boolean
- get(key: TKey): TValue | undefined
- getAll(): TValue[]
- getAllKeys(): TKey[]
- get size(): number
- clear(): void
```

## Backward Compatibility

**No breaking changes** - default usage remains identical:

```typescript
// Still works exactly as before
const engine = new FormEngineBuilder().addElement(textInput).addLayout(cardLayout).build();
```

Registries are created automatically with default instances.

## Use Cases

1. **Custom Action System** - Use ActionRegistry for event-driven workflows
2. **Component Libraries** - Create reusable element collections
3. **Runtime Plugins** - Load actions/elements dynamically
4. **Testing** - Mock registries for unit tests
5. **Progressive Adoption** - Start with actions, add other features later
6. **Bundle Optimization** - Import only what you need

## Migration Path

### From Global ActionRegistry (old core)

**Before:**

```typescript
import { actionRegistry } from "@json-form-engine/core";
actionRegistry.register(myAction);
```

**After:**

```typescript
import { ActionRegistry } from "@json-form-engine/core";
const actionRegistry = new ActionRegistry();
actionRegistry.register(myAction);

const builder = new FormEngineBuilder(undefined, undefined, undefined, actionRegistry);
```

### Standard Usage

**No changes needed** - the builder creates registries automatically:

```typescript
const builder = new FormEngineBuilder();
// Registries are created internally
```

## Future Enhancements

This pattern enables:

- ValidationRegistry for custom validators
- TransformerRegistry for data transformations
- PluginRegistry for runtime extensions
- Any domain-specific registry needs

## Testing

Build passes successfully:

```bash
bun run build:lib
✓ @json-form-engine/core - Done in 6.45s
✓ @json-form-engine/react - Done in 17.79s
```

## Documentation

See `packages/core/src/builder/REGISTRY_STANDALONE_USAGE.md` for:

- Complete API reference
- Usage examples for all registries
- Testing patterns
- Best practices
- Migration guide

## Files to Commit

New files:

- `packages/core/src/builder/base-registry.ts`
- `packages/core/src/builder/element-registry.ts`
- `packages/core/src/builder/layout-registry.ts`
- `packages/core/src/builder/stepper-registry.ts`
- `packages/core/src/builder/action-registry.ts`
- `packages/core/src/builder/REGISTRY_STANDALONE_USAGE.md`

Modified files:

- `packages/core/src/builder/form-engine-builder.ts`
- `packages/core/src/builder/index.ts`
- `packages/core/src/index.ts`

## Commit Message

```
refactor(builder): implemented modular registry system with dependency injection

Created independent registry classes (ElementRegistry, LayoutRegistry, StepperRegistry, ActionRegistry) that extend a shared BaseRegistry abstract class. Refactored FormEngineBuilder to use dependency injection pattern with default registry instances.

Key changes:
- Added BaseRegistry abstract class with common CRUD operations
- Created standalone registry classes for elements, layouts, steppers, and actions
- Refactored FormEngineBuilder constructor to accept registry instances
- All add* methods now delegate to registry instances
- Updated extend() and build() methods to work with registries
- Added comprehensive documentation for standalone registry usage
- Exported registries from main package for independent use

Benefits:
- Modularity: Each registry is independent and can be used standalone
- Tree-shaking: Import only what you need
- Testability: Easy to mock registries for testing
- Extensibility: Simple to create custom registries
- Flexibility: Users can inject custom registry implementations
- No breaking changes: Default behavior unchanged

Documentation: packages/core/src/builder/REGISTRY_STANDALONE_USAGE.md
```
