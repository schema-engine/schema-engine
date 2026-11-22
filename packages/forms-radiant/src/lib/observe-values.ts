import type { FormStateContainer } from '@schema-engine/forms/state-container';

/**
 * Calls `listener` with the values each time they change, and not for any other change of the container.
 *
 * @remarks
 * The container keeps the same `values` object until a value changes, so a change in touched, error or
 * validation state is no change of values and an unchanged write is none either. The values current when
 * called are the baseline: the listener is not called for them.
 *
 * @returns Stops observing.
 */
export function observeValues(
	container: FormStateContainer,
	listener: (values: Readonly<Record<string, unknown>>) => void,
): () => void {
	let seen = container.getSnapshot().values;
	return container.subscribe(() => {
		const { values } = container.getSnapshot();
		if (values === seen) return;
		seen = values;
		listener(values);
	});
}
