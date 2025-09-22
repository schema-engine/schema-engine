# Debouncing Implementation for Async Validation

## Overview

Fixed the async validation debouncing issue by creating a centralized debounce utility and properly implementing it in the async validation handler.

## Changes Made

### 1. Created Centralized Debounce Utility (`/packages/core/src/lib/debounce.ts`)

- **`debounce(fn, delay, key)`** - Promise-based debouncing with unique keys
- **`createDebounced(fn, delay)`** - Synchronous debounce for event handlers
- **`clearAllDebounces()`** - Cleanup utility for component unmounting
- **`clearDebounce(key)`** - Cancel specific debounced operation
- **`getPendingDebounces()`** - Debug utility to check pending operations

### 2. Updated Async Validation Handler

- **Proper debouncing implementation** - Now actually delays validation execution
- **Cache-first approach** - Checks cache before debouncing to avoid unnecessary delays
- **Unique debounce keys** - Each validation gets unique key: `async-validation:${url}:${payload}`
- **Clean separation** - Validation logic extracted into `performValidation` function

### 3. Package Structure Updates

- **Export configuration** - Added `"./lib/debounce"` export in package.json
- **Core exports** - Added lib utilities to main package exports
- **Documentation** - Updated JSDoc to reflect actual debouncing behavior

## How It Works

```typescript
// Before: No actual debouncing
{
  type: 'async',
  debounce: 500 // ❌ This was ignored
}

// After: Real debouncing
{
  type: 'async',
  debounce: 500 // ✅ Actually delays validation by 500ms
}
```

## Benefits

✅ **Performance** - Reduces unnecessary API calls during rapid typing  
✅ **User Experience** - Smoother validation without constant loading states  
✅ **Reusable** - Debounce utility can be used throughout the form engine  
✅ **Configurable** - Each validation rule can have its own debounce timing  
✅ **Cache-aware** - Cached results bypass debouncing for instant feedback

## Example Usage

```typescript
// Async validation with 500ms debounce
{
  type: 'async',
  url: '/api/validate-username',
  debounce: 500,
  cacheTTL: 300000
}

// Direct usage of debounce utility
import { debounce } from '@json-form-engine/core/lib/debounce';

await debounce(
  () => validateField(value),
  300,
  `validation:${fieldName}`
);
```

The debouncing now works as expected - validation requests are properly delayed and canceled/restarted when users type rapidly, significantly improving performance and user experience.
