/**
 * Main Registration Re-exports
 *
 * Convenience re-exports for all component registrations.
 * For better organization, prefer importing from specific files:
 * - `@json-form-engine/react/registrations/elements/shadcn`
 * - `@json-form-engine/react/registrations/layouts`
 * - `@json-form-engine/react/registrations/stepper`
 *
 * Each import triggers type augmentation for that specific component only.
 * This ensures that only the components you actually use are registered in the type system.
 *
 * @example Organized Imports (Recommended)
 * ```typescript
 * import { InputElementRegistration } from '@json-form-engine/react/registrations/elements/shadcn';
 * import { CardLayoutRegistration } from '@json-form-engine/react/registrations/layouts';
 * import { DefaultStepperRegistration } from '@json-form-engine/react/registrations/stepper';
 * ```
 *
 * @example Multiple Imports from this file
 * ```typescript
 * import {
 *   InputElementRegistration,
 *   TextareaElementRegistration,
 *   CardLayoutRegistration
 * } from '@json-form-engine/react/registrations';
 * ```
 *
 * Benefits:
 * - Only imported components are type-registered
 * - Multiple builders with different components work correctly
 * - Tree-shakeable - unused components do not affect bundle size or types
 * - Explicit imports make dependencies clear
 */

export * from './registrations/elements/shadcn';
export * from './registrations/layouts';
export * from './registrations/stepper';
