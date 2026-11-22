import { useEffect, useMemo, useRef } from 'react';
import { toFieldArrayValue, type FieldArrayValue } from '@schema-engine/forms/state-container';
import { useContainerSelector, useFormStateContext } from './context';

/**
 * The rows of the array at `name` and the commands that change them.
 *
 * @remarks
 * Rows are the container's, so a row keeps its id, errors and touched state through every operation (dirty is
 * the comparison with the defaults, index by index), and a falsy row (`''`, `0`, `false`) is a row. An operation that adds rows (`append`,
 * `prepend`, `insert`) focuses the first control of the first row it added, once that row has rendered,
; an operation that changes no row focuses nothing. The same object comes back
 * until the rows change.
 */
export function useFieldArray(name: string): FieldArrayValue {
	const { container, fields } = useFormStateContext();
	const rowIds = useContainerSelector((snapshot) =>
		Object.hasOwn(snapshot.rowIds, name) ? snapshot.rowIds[name] : undefined,
	);
	const commands = container.fieldArray(name);
	const value = toFieldArrayValue(rowIds, commands);
	const addedRow = useRef<string | undefined>(undefined);

	useEffect(() => {
		if (addedRow.current === undefined) return;
		fields.focusWithin(addedRow.current);
		addedRow.current = undefined;
	}, [rowIds, fields]);

	return useMemo(() => {
		const currentRowIds = () => container.getSnapshot().rowIds[name];
		const adding =
			<TArgs extends unknown[]>(command: (...args: TArgs) => void, firstAdded: (...args: TArgs) => number) =>
			(...args: TArgs) => {
				const before = currentRowIds();
				const index = firstAdded(...args);
				command(...args);
				if (currentRowIds() !== before) addedRow.current = `${name}.${index}`;
			};
		return {
			...value,
			append: adding(commands.append, () => currentRowIds()?.length ?? 0),
			prepend: adding(commands.prepend, () => 0),
			insert: adding(commands.insert, (index) => index),
		};
	}, [value, commands, container, name]);
}
