# Multiple Builders Type Isolation Tests

This test suite verifies that the per-component registration pattern works correctly, allowing multiple FormEngineBuilder instances in the same codebase with different component sets.

## Running the Tests

```bash
# From the react package directory
bun test test/builder/multiple-builders-type-isolation.test.ts

# Or from the root
cd packages/react && bun test test/builder/multiple-builders-type-isolation.test.ts
```

## What This Tests

### 1. Independent Builders

Verifies that two builders in the same application can have completely different component sets:

```typescript
const builder1 = createReactFormEngine().addElement(InputElementRegistration);
const builder2 = createReactFormEngine().addElement(TextareaElementRegistration);

const engine1 = builder1.build();
const engine2 = builder2.build();

// ✅ engine1 only has input
expect(engine1.hasElement('input')).toBe(true);
expect(engine1.hasElement('textarea')).toBe(false);

// ✅ engine2 only has textarea
expect(engine2.hasElement('input')).toBe(false);
expect(engine2.hasElement('textarea')).toBe(true);
```

### 2. No Type Leakage

Components registered in one builder don't leak to another builder. This is the key benefit of the per-component registration pattern.

### 3. Explicit Registration

The type system accurately reflects what each builder has registered. No "ghost types" from components you didn't import.

### 4. Runtime Verification

All tests verify both compile-time types and runtime behavior match:

- `engine.hasElement(id)` - Check if element is registered
- `engine.getElement(id)` - Retrieve element registration
- `engine.hasLayout(id)` - Check if layout is registered
- `engine.getLayout(id)` - Retrieve layout registration
- `engine.hasStepper(id)` - Check if stepper is registered
- `engine.getStepper(id)` - Retrieve stepper registration

## Test Files

### `multiple-builders-type-isolation.test.ts`

Tests that multiple builders can coexist with different component sets.

### `engine-type-safety.test.ts`

Tests that the `FormEngine` returned by `build()` is properly typed (not `any`).

### `react-builder.test.ts`

General builder functionality tests.

## Test Coverage

- ✅ Minimal builder (only 2 elements)
- ✅ Full builder (all available elements)
- ✅ Two independent builders with different components
- ✅ Retrieving registered components
- ✅ Method chaining
- ✅ Empty builder
- ✅ No shared state between builders
- ✅ Type safety verification
- ✅ Engine is properly typed (not `any`)
- ✅ All engine methods are typed and accessible

## Expected Results

All tests should pass, demonstrating:

1. **Predictability**: Only imported components are available
2. **Isolation**: Builders don't interfere with each other
3. **Type Safety**: TypeScript types match runtime behavior
4. **Debuggability**: You can grep for imports to see what's registered

## Why This Matters

Without per-component registration, all imported components would be registered globally, causing:

- Type pollution (types available even when not registered)
- Confusing type errors
- Difficult debugging (where did this type come from?)
- Multiple builders would all show the same types

With per-component registration:

- ✅ Import = Register (explicit and predictable)
- ✅ Each builder has its own component set
- ✅ Types accurately reflect reality
- ✅ Easy to debug (grep for imports)
