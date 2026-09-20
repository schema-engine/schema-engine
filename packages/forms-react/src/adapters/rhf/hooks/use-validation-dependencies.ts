import { useEffect } from 'react';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import { buildDependencyIndex, shouldSurfaceDependentError } from '@schema-engine/forms/schemas/validation';
import { useFormEngine } from '@/hooks/use-form-context';

/**
 * Re-validates a field when a field its rules read changes.
 *
 * @remarks
 * Re-validation goes through `trigger` rather than through the resolver's own
 * `options.names`. Widening that set would rely on React Hook Form merging
 * errors for fields it did not ask about, which is not part of its documented
 * contract and could change in a minor release; `trigger` is correct either way.
 *
 * Only a dependent the user has already touched, or any dependent once the form
 * has been submitted, is re-validated, so typing a password does not light up a
 * confirmation nobody has reached yet. `submitCount` is read during render, both
 * so the provider subscribes to it and so the subscription is rebuilt when it
 * changes — once per submit, which is cheaper than the ref it replaces.
 */
export function useValidationDependencies(form: UseFormReturn<any>, elements: readonly object[]): void {
	const { engine } = useFormEngine();
	const registry = engine.getValidationRegistry();
	const { watch, trigger, getValues, getFieldState, formState } = form;
	const submitted = formState.submitCount > 0;

	useEffect(() => {
		const subscription = watch((_values, { name }) => {
			if (!name) {
				return;
			}

			const dependents = buildDependencyIndex(elements, getValues() as FieldValues, registry).dependentsOf(name);
			const surfaceable = dependents.filter((path) =>
				shouldSurfaceDependentError({
					touched: getFieldState(path as FieldPath<FieldValues>).isTouched,
					submitted,
				}),
			);

			if (surfaceable.length > 0) {
				void trigger(surfaceable as FieldPath<FieldValues>[]);
			}
		});

		return () => subscription.unsubscribe();
	}, [watch, trigger, getValues, getFieldState, elements, submitted, registry]);
}
