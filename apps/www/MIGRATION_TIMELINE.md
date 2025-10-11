# WWW App Migration Timeline

## Overview

This document outlines the step-by-step process to migrate the `www` app from the old registry pattern to the new **Builder Pattern** architecture introduced in the core refactor.

## Current State (COMPLETED)

- [x] Core package refactored with `FormEngineBuilder`
- [x] React package has registration objects exported
- [x] React package built with TypeScript declarations
- [x] WWW app updated with new setup pattern
- [x] Builder Pattern documentation created
- [x] Quick Start guide updated
- [x] Builder demo component created
- [ ] Update all demo components (in progress)
- [ ] Test all pages

## Migration Steps

### Phase 1: Setup & Dependencies (30 min)

#### Step 1.1: Update Core Setup File

**File**: `apps/www/src/lib/form-engine-setup.ts`

**Current**:
```typescript
import '@json-form-engine/core/actions/debug-registry';
import '@json-form-engine/react/registrations';
```

**New**:
```typescript
/**
 * Centralized form engine instance for www app
 * Uses the new Builder Pattern
 */
import { createReactFormEngine } from '@json-form-engine/react';
import {
  InputElement,
  TextareaElement,
  CheckboxElement,
  RadioElement,
  SelectElement,
  SwitchElement,
  NumberElement,
  CardLayoutRegistration,
  SplitScreenLayoutRegistration,
  HeroBackgroundLayoutRegistration,
  DefaultStepperRegistration,
  VerticalStepperRegistration,
  MinimalistStepperRegistration,
  DebuggerStepperRegistration,
} from '@json-form-engine/react/registrations';

// Build the form engine with all components
export const formEngine = createReactFormEngine()
  // Register all input elements
  .addElement(InputElement)
  .addElement(TextareaElement)
  .addElement(CheckboxElement)
  .addElement(RadioElement)
  .addElement(SelectElement)
  .addElement(SwitchElement)
  .addElement(NumberElement)
  
  // Register all layouts
  .addLayout(CardLayoutRegistration)
  .addLayout(SplitScreenLayoutRegistration)
  .addLayout(HeroBackgroundLayoutRegistration)
  
  // Register all steppers
  .addStepper(DefaultStepperRegistration)
  .addStepper(VerticalStepperRegistration)
  .addStepper(MinimalistStepperRegistration)
  .addStepper(DebuggerStepperRegistration)
  
  .build();
```

**Action**: Replace entire file content

---

#### Step 1.2: Remove Old Registry Setup

**File**: `apps/www/src/lib/form-registry-setup.ts`

**Action**: Delete this file (no longer needed)

---

### Phase 2: Update Components (1 hour)

#### Step 2.1: Update FormRenderer Usage

All components that use `FormRenderer` need to import the new `formEngine` instance.

**Files to update**:
- `apps/www/src/components/contact-form-example.tsx`
- `apps/www/src/components/demo/form-engine-demo.tsx`
- `apps/www/src/components/demo/contact-form-demo.tsx`
- `apps/www/src/components/demo/multi-step-demo.tsx`
- All other demo files

**Pattern**:

**Current**:
```typescript
import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import '@/lib/form-engine-setup';
```

**New**:
```typescript
import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { formEngine } from '@/lib/form-engine-setup';

// Pass formEngine to FormRenderer
<FormRenderer config={myConfig} engine={formEngine} />
```

**Action**: Update all demo components with the new pattern

---

### Phase 3: Update Documentation (2 hours)

#### Step 3.1: Update Quick Start Guide

**File**: `apps/www/src/pages/docs/quick-start.mdx`

Add new section at the beginning explaining the Builder Pattern:

```mdx
## Understanding the Builder Pattern

Form Engine uses a **Builder Pattern** to configure and instantiate the form engine. This provides:

- **Type Safety**: Full TypeScript support with autocomplete
- **Explicit Configuration**: See exactly what's registered
- **Tree-Shaking**: Only bundle what you use
- **Flexibility**: Easy to add custom components

### Creating Your Form Engine Instance

```typescript
import { createReactFormEngine } from '@json-form-engine/react';
import { InputElement, TextareaElement } from '@json-form-engine/react/registrations';

const formEngine = createReactFormEngine()
  .addElement(InputElement)
  .addElement(TextareaElement)
  .build();
```

The `formEngine` instance is immutable and can be reused across your application.
```

**Action**: Insert new section and update all code examples

---

#### Step 3.2: Update Installation Guide

**File**: `apps/www/src/pages/docs/installation.mdx`

Add section on Builder Pattern setup:

```mdx
## Setting Up the Form Engine

After installation, create a form engine instance:

```typescript
// lib/form-engine.ts
import { createReactFormEngine } from '@json-form-engine/react';
import {
  InputElement,
  TextareaElement,
  SelectElement,
  CheckboxElement,
} from '@json-form-engine/react/registrations';

export const formEngine = createReactFormEngine()
  .addElement(InputElement)
  .addElement(TextareaElement)
  .addElement(SelectElement)
  .addElement(CheckboxElement)
  .build();
```

Then use it in your components:

```typescript
import { FormRenderer } from '@json-form-engine/react';
import { formEngine } from './lib/form-engine';

function MyForm() {
  return <FormRenderer config={formConfig} engine={formEngine} />;
}
```
```

---

#### Step 3.3: Create New Builder Pattern Documentation

**File**: `apps/www/src/pages/docs/builder/index.mdx`

**Content**: Complete guide to the Builder Pattern (see detailed content below)

---

#### Step 3.4: Update Component Registration Docs

**File**: `apps/www/src/pages/docs/components/registration.mdx`

Update to explain the new registration object pattern:

```mdx
## Creating Custom Components

### 1. Define Your Component

```typescript
// components/custom-input.tsx
import type { ReactElementRegistration } from '@json-form-engine/react';
import { z } from 'zod';

const CustomInputConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  // ... your config
});

export function CustomInput({ config }: { config: z.infer<typeof CustomInputConfigSchema> }) {
  // Your component implementation
  return <input {...config} />;
}

export const CustomInputElement: ReactElementRegistration = {
  componentId: 'custom-input',
  component: CustomInput,
  schema: CustomInputConfigSchema,
  metadata: {
    name: 'Custom Input',
    description: 'A custom input field',
    category: 'input',
  },
};
```

### 2. Register Your Component

```typescript
import { formEngine } from './lib/form-engine';
import { CustomInputElement } from './components/custom-input';

const myFormEngine = createReactFormEngine()
  .addElement(CustomInputElement)
  // ... other components
  .build();
```

### 3. Use in Form Config

```typescript
const formConfig = {
  steps: [{
    elements: [{
      componentId: 'custom-input',
      id: 'myField',
      name: 'myField',
      label: 'My Custom Field',
    }]
  }]
};
```
```

---

### Phase 4: Create Examples (1 hour)

#### Step 4.1: Create Builder Example

**File**: `apps/www/src/components/demo/builder-demo.tsx`

Complete example showing:
1. Creating a form engine
2. Registering components
3. Using the engine
4. Type safety benefits

---

#### Step 4.2: Update Existing Examples

Update all existing demo files to use the new pattern consistently.

---

### Phase 5: Testing & Validation (30 min)

#### Step 5.1: Run Tests

```bash
cd apps/www
bun test
```

#### Step 5.2: Visual Testing

1. Start dev server: `bun dev`
2. Visit all demo pages
3. Verify forms render correctly
4. Test all interactions
5. Check console for errors

#### Step 5.3: Type Checking

```bash
cd apps/www
bun run typecheck
```

---

### Phase 6: Documentation Polish (1 hour)

#### Step 6.1: Update README

**File**: `apps/www/README.md`

Add section on the Builder Pattern and link to documentation.

#### Step 6.2: Create Migration Guide for Users

**File**: `apps/www/src/pages/docs/migration/v2.mdx`

Guide for users migrating from old pattern to new Builder Pattern.

#### Step 6.3: Update Architecture Diagram

Create visual diagram showing:
- FormEngineBuilder
- Registration objects
- Runtime FormEngine
- Component flow

---

## Estimated Timeline

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Setup & Dependencies | 30 min | HIGH |
| Phase 2: Update Components | 1 hour | HIGH |
| Phase 3: Update Documentation | 2 hours | MEDIUM |
| Phase 4: Create Examples | 1 hour | MEDIUM |
| Phase 5: Testing & Validation | 30 min | HIGH |
| Phase 6: Documentation Polish | 1 hour | LOW |
| **Total** | **6 hours** | |

## Success Criteria

- [ ] All demo pages render without errors
- [ ] FormRenderer uses new `engine` prop pattern
- [ ] All documentation updated with Builder Pattern examples
- [ ] Type safety works throughout
- [ ] No console errors in browser
- [ ] All tests pass
- [ ] Examples demonstrate new pattern clearly

## Rollback Plan

If issues arise:

1. Git branch: `feature/builder-refactor`
2. Revert changes: `git revert <commit>`
3. File backup in: `apps/www/.backup/`

## Notes

- Keep old pattern documented for legacy users
- Add deprecation warnings for old approach
- Provide codemods if possible for easier migration
- Update all TypeScript types in examples

## Next Steps After Migration

1. Create video tutorial
2. Write blog post announcement
3. Update changelog
4. Tag release
5. Update package.json versions
