import { useId, useState } from 'react';
import { useFieldArray as useRHFFieldArray, useFormContext } from 'react-hook-form';
import type { FieldArrayValue } from '../../types';

interface RowIds {
	ids: string[];
	next: number;
	/** The array value the ids were last reconciled with. */
	source: unknown;
}

type RowIdChange = (previous: RowIds) => Pick<RowIds, 'ids' | 'next'>;

const toRows = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);
const isRowIndex = (index: number, length: number) => Number.isInteger(index) && index >= 0 && index < length;

/**
 * Field array over React Hook Form that keeps falsy rows.
 *
 * @remarks
 * React Hook Form reads a field array through a filter that drops falsy rows, so
 * a scalar array such as `tags: ['', '']` would render no rows, and each of its
 * operations would write the array back without them. The row count therefore
 * follows the form value, and row ids are minted here from `useId` plus a
 * counter, so server and client agree.
 *
 * Every operation still runs React Hook Form's own, which moves errors, touched
 * state with their rows by index and focuses an added row. When a row
 * was falsy, the values it wrote are the filtered ones, so the full rows are
 * written back over them with `setValue`. Focus is named explicitly, because
 * React Hook Form counts the added row's index over the filtered rows and
 * expects a trailing `.` that a scalar row's field name lacks.
 *
 * Indexes follow Radiant's field array: an operation naming a row that does
 * not exist does nothing, and `remove` removes each listed row once, where
 * React Hook Form would remove a repeated index once per occurrence.
 *
 * Rows get new ids when the array is replaced from outside, such as by
 * `reset`, as React Hook Form's own ids do. A replacement is a new array whose
 * contents differ from the last one; an equal copy is how React Hook Form
 * moves from default values to live values when the form mounts, so it keeps
 * the ids.
 */
export function useFieldArray(name: string): FieldArrayValue {
	const { control, getValues, setValue } = useFormContext();
	const array = useRHFFieldArray({ control, name });
	const idPrefix = useId();

	const read = (): unknown => getValues(name);
	const rows = (): unknown[] => {
		const rowValues = read();
		return Array.isArray(rowValues) ? [...rowValues] : [];
	};
	const newIds = (next: number, count: number) =>
		Array.from({ length: count }, (_, index) => `${idPrefix}${next + index}`);
	const [rowIds, setRowIds] = useState<RowIds>(() => {
		const count = rows().length;
		return { ids: newIds(0, count), next: count, source: read() };
	});

	const arrayValue = read();
	const rowCount = rows().length;
	let current = rowIds;
	if (arrayValue !== current.source) {
		current =
			JSON.stringify(arrayValue) === JSON.stringify(current.source)
				? { ...current, source: arrayValue }
				: { ids: newIds(current.next, rowCount), next: current.next + rowCount, source: arrayValue };
	}
	if (current.ids.length !== rowCount) {
		const added = Math.max(0, rowCount - current.ids.length);
		current = {
			...current,
			ids: [...current.ids.slice(0, rowCount), ...newIds(current.next, added)],
			next: current.next + added,
		};
	}
	if (current !== rowIds) setRowIds(current);

	/** @remarks Ids are updated last, so they record the array value the operation wrote. */
	const commit = (nextRows: unknown[], nextIds: RowIdChange, native: () => void) => {
		const keepsFalsyRows = !rows().every(Boolean);
		native();
		if (keepsFalsyRows) setValue(name, nextRows, { shouldDirty: true });
		const source = read();
		setRowIds((previous) => ({ ...nextIds(previous), source }));
	};
	const focus = (index: number, row: unknown) => ({
		focusName: `${name}.${index}${typeof row === 'object' && row !== null ? '.' : ''}`,
	});
	const insertRows = (index: number, rowValue: unknown, native: (inserted: unknown[]) => void) => {
		const nextRows = rows();
		if (!Number.isInteger(index) || index < 0 || index > nextRows.length) return;
		const inserted = toRows(rowValue);
		if (inserted.length === 0) return;
		nextRows.splice(index, 0, ...inserted);
		commit(
			nextRows,
			({ ids, next }) => {
				const nextIds = [...ids];
				nextIds.splice(index, 0, ...newIds(next, inserted.length));
				return { ids: nextIds, next: next + inserted.length };
			},
			() => native(inserted),
		);
	};
	const rearrange = (indexes: number[], change: <T>(list: T[]) => T[], native: () => void) => {
		const previousRows = rows();
		if (!indexes.every((index) => isRowIndex(index, previousRows.length))) return;
		commit(change(previousRows), ({ ids, next }) => ({ ids: change(ids), next }), native);
	};

	return {
		fields: current.ids.map((id) => ({ id })),
		append: (value) => {
			const index = rows().length;
			insertRows(index, value, (inserted) =>
				array.append(inserted, focus(index + inserted.length - 1, inserted.at(-1))),
			);
		},
		prepend: (value) => insertRows(0, value, (inserted) => array.prepend(inserted, focus(0, inserted[0]))),
		insert: (index, value) =>
			insertRows(index, value, (inserted) => array.insert(index, inserted, focus(index, inserted[0]))),
		update: (index, value) => {
			const previousRows = rows();
			if (!isRowIndex(index, previousRows.length)) return;
			previousRows[index] = value;
			commit(
				previousRows,
				({ ids, next }) => ({
					ids: ids.map((id, position) => (position === index ? newIds(next, 1)[0] : id)),
					next: next + 1,
				}),
				() => array.update(index, value),
			);
		},
		replace: (values) => {
			array.replace(values);
			const source = read();
			setRowIds(({ next }) => ({ ids: newIds(next, values.length), next: next + values.length, source }));
		},
		swap: (indexA, indexB) =>
			rearrange(
				[indexA, indexB],
				(list) => {
					const next = [...list];
					[next[indexA], next[indexB]] = [next[indexB], next[indexA]];
					return next;
				},
				() => array.swap(indexA, indexB),
			),
		move: (from, to) =>
			rearrange(
				[from, to],
				(list) => {
					const next = [...list];
					next.splice(to, 0, ...next.splice(from, 1));
					return next;
				},
				() => array.move(from, to),
			),
		remove: (index) => {
			const count = rows().length;
			const removed =
				index === undefined
					? undefined
					: [...new Set(Array.isArray(index) ? index : [index])].filter((position) =>
							isRowIndex(position, count),
						);
			if (removed?.length === 0) return;
			const keep = <T>(list: T[]) =>
				removed === undefined ? [] : list.filter((_, position) => !removed.includes(position));
			commit(
				keep(rows()),
				({ ids, next }) => ({ ids: keep(ids), next }),
				() => array.remove(removed),
			);
		},
	};
}
