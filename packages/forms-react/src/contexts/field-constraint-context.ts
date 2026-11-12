import { createContext } from 'react';
import type { AppearanceSelection } from '@schema-engine/forms/lib/appearance';
import type { UseConstraintLogicResult } from '@/hooks/use-constraint-logic';

export interface FieldConstraints {
	fieldPath: string;
	constraints: UseConstraintLogicResult;
}

/**
 * Constraint result `FormElement` evaluated for the field it renders.
 *
 * @remarks
 * `useControlledFormElement` reads `isRequired` from here instead of watching
 * the same constraint paths again. It is keyed by field path, so a control a
 * component binds to another name still evaluates its own constraints.
 */
export const FieldConstraintContext = createContext<FieldConstraints | null>(null);

/**
 * State a container passes to every element inside it, at any depth.
 *
 * @remarks
 * `disabled` is the container's authored or constraint-driven disabled state.
 * `required` holds while a `require` constraint of the container, or of a
 * container around it, holds; a container's own `required` rule does not pass
 * down. Fieldsets and arrays both pass it, so a disabled array disables its rows.
 * The engine's `validateFormValues` applies the same `require` rule.
 */
export interface InheritedFieldState {
	disabled: boolean;
	required: boolean;
}

export const InheritedFieldStateContext = createContext<InheritedFieldState>({ disabled: false, required: false });

/**
 * What a field host takes from the element `FormElement` is rendering.
 *
 * @remarks
 * Field hosts (`FieldGroupRoot`, `useFieldHost`) read it through `useFieldAppearanceAttributes` and
 * `useFieldClassName`, so a registry component does not thread `appearance` or `className` into its
 * host by hand. A nested element's own `FormElement` provides its own value, so a container's
 * appearance and class never reach its children's hosts.
 */
export interface FieldHostConfig {
	appearance?: AppearanceSelection;
	className?: string;
}

export const FieldHostContext = createContext<FieldHostConfig | undefined>(undefined);
