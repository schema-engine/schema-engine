import { createContext } from '@ecopages/radiant/context';

/** What the constraint wrappers around a field, its own and its containers', add to its `disabled` and `required`. */
export interface ConstraintState {
	readonly disabled: boolean;
	readonly required: boolean;
}

/**
 * Provided by `se-constraint`; undefined until the wrapper has evaluated its constraints.
 *
 * @remarks
 * A wrapper provides the union of its own constraints and those of the wrappers around
 * it, so a consumer reads the nearest provider only.
 */
export const constraintContext = createContext<ConstraintState | undefined>(Symbol.for('se-constraint-context'));

/** The live form values the constraint hosts evaluate against. */
export interface FormValuesContextValue {
	/** Nested value tree, in the shape `evaluateConstraints` reads. */
	readonly values: Record<string, unknown>;
	/** Whether the form config authors the field at a rendered path `disabled`, itself or through a container. */
	readonly isAuthoredDisabled: (renderedPath: string) => boolean;
}

/** Provided by `se-form-instance`; undefined until its form is ready. */
export const formValuesContext = createContext<FormValuesContextValue | undefined>(
	Symbol.for('se-form-values-context'),
);
