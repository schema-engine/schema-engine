import type { FieldArrayValue } from '../../types';
import { getActiveFormStore } from '../../store/active-store';
import { createFieldId, type FormStore } from '../../store/form-store';

interface FieldArrayRow {
	id: string;
	value: unknown;
}

interface FieldArraySnapshot {
	values: unknown[] | undefined;
	rows: FieldArrayRow[];
}

const fieldArrays = new WeakMap<FormStore, Map<string, FieldArraySnapshot>>();

function createRow(value: unknown): FieldArrayRow {
	return { id: createFieldId(), value };
}

function createRows(value: unknown): FieldArrayRow[] {
	return (Array.isArray(value) ? value : [value]).map(createRow);
}

/**
 * @remarks
 * Row identity is shared across hook calls for the same store and field. Mutations
 * move IDs with their values; update and replace create new IDs. Replacing the
 * array outside this API resets its IDs on the next read.
 */
export function useFieldArray(fieldName: string): FieldArrayValue {
	const store = getActiveFormStore();
	let arrays = fieldArrays.get(store);
	if (!arrays) {
		arrays = new Map();
		fieldArrays.set(store, arrays);
	}
	const snapshots = arrays;

	const getRows = (): FieldArrayRow[] => {
		const values = store.getValue<unknown[]>(fieldName);
		let snapshot = snapshots.get(fieldName);
		if (!snapshot || snapshot.values !== values) {
			const current = values ?? [];
			snapshot = { values, rows: current.map(createRow) };
			snapshots.set(fieldName, snapshot);
		}
		snapshot.rows = (values ?? []).map((value, index) => ({
			id: snapshot.rows[index]?.id ?? createFieldId(),
			value,
		}));
		return snapshot.rows;
	};

	const commit = (rows: FieldArrayRow[]) => {
		const values = rows.map((row) => row.value);
		snapshots.set(fieldName, { values, rows });
		store.setValue(fieldName, values);
	};

	return {
		get fields() {
			return getRows().map(({ id }) => ({ id }));
		},
		append: (value) => commit([...getRows(), ...createRows(value)]),
		prepend: (value) => commit([...createRows(value), ...getRows()]),
		insert: (index, value) => {
			const next = [...getRows()];
			next.splice(index, 0, ...createRows(value));
			commit(next);
		},
		swap: (indexA, indexB) => {
			const next = [...getRows()];
			if (indexA >= 0 && indexA < next.length && indexB >= 0 && indexB < next.length) {
				[next[indexA], next[indexB]] = [next[indexB], next[indexA]];
			}
			commit(next);
		},
		move: (indexA, indexB) => {
			const next = [...getRows()];
			if (indexA < 0 || indexA >= next.length) return;
			const [item] = next.splice(indexA, 1);
			next.splice(indexB, 0, item);
			commit(next);
		},
		update: (index, value) => {
			const next = [...getRows()];
			next[index] = createRow(value);
			commit(next);
		},
		replace: (value) => commit(value.map(createRow)),
		remove: (index) => {
			const indexes = new Set(Array.isArray(index) ? index : [index]);
			commit(index === undefined ? [] : getRows().filter((_, itemIndex) => !indexes.has(itemIndex)));
		},
	};
}
