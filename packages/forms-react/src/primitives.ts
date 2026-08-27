/**
 * Stable runtime contracts used by consumer-owned form registrations.
 *
 * Registry components must use this entrypoint instead of reaching into
 * package implementation paths.
 */
export { FormElement } from './components/internals/field-renderer';
export type { FormElementProps } from './components/internals/field-renderer';
export { combineHandlers, useControlledFormElement } from './hooks/use-field';
export type { UseControlledFormElementReturn } from './hooks/use-field';
