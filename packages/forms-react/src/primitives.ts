/**
 * Stable runtime contracts used by consumer-owned form registrations.
 *
 * Registry components must use this entrypoint instead of reaching into
 * package implementation paths.
 */
import type React from 'react';
import type { FormShellLayout } from '@schema-engine/forms/recipes';

export { FormElement } from './components/internals/field-renderer';
export type { FormElementProps } from './components/internals/field-renderer';
export { combineHandlers, useControlledFormElement } from './hooks/use-field';
export type { UseControlledFormElementReturn } from './hooks/use-field';

/** Stable React recipe contracts for consumer-owned view implementations. */
export type FormShellProps = FormShellLayout<React.ReactNode>;
export type FormShellComponent = React.FC<FormShellProps>;
export interface ReactRecipeAdapterPayload {
	shell?: FormShellComponent;
	slots: Partial<Record<'header' | 'progress' | 'actions', React.FC>>;
}
