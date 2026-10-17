import { useId, useState } from 'react';
import { useFieldArray as useRHFFieldArray, useFormContext } from 'react-hook-form';
import type { FieldArrayValue } from '../../types';

interface RowIds {
	ids: string[];
	next: number;
}

const toRows = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

/**
 * Field array over React Hook Form that keeps falsy rows.
 *
 * @remarks
 * React Hook Form reads a field array through a filter that drops falsy rows, so
 * a scalar array such as `tags: ['', '']` would render no rows, and each of its
 * operations would write the array back without them. The row count therefore
 * follows the form value, and row ids are minted here from `useId` plus a
 * counter, so server and client agree. While every row is truthy an operation
 * delegates to React Hook Form, which moves errors and touched state with their
 * rows. Otherwise the next array is written with `replace`, which keeps every
 * row but leaves errors and touched state at their old indexes: an array that
 * had errors is validated again, while touched state stays misaligned. A remove
 * of several indexes always takes the `replace` path, because React Hook Form
 * removes a repeated index once per occurrence, while the ids here (and
 * Radiant) remove each listed row once.
 */
export function useFieldArray(name: string): FieldArrayValue {
	const { control, getValues, getFieldState, trigger } = useFormContext();
	const array = useRHFFieldArray({ control, name });
	const idPrefix = useId();

	const rows = (): unknown[] => {
		const value: unknown = getValues(name);
		return Array.isArray(value) ? [...value] : [];
	};
	const newIds = (next: number, count: number) =>
		Array.from({ length: count }, (_, index) => `${idPrefix}${next + index}`);
	const [rowIds, setRowIds] = useState<RowIds>(() => {
		const count = rows().length;
		return { ids: newIds(0, count), next: count };
	});

	const length = rows().length;
	let current = rowIds;
	if (rowIds.ids.length !== length) {
		const added = Math.max(0, length - rowIds.ids.length);
		current = { ids: [...rowIds.ids.slice(0, length), ...newIds(rowIds.next, added)], next: rowIds.next + added };
		setRowIds(current);
	}

	/** @remarks Without `native`, the array is always written with `replace`. */
	const commit = (
		previousRows: unknown[],
		nextRows: unknown[],
		nextIds: (previous: RowIds) => RowIds,
		native?: () => void,
	) => {
		setRowIds(nextIds);
		if (native && previousRows.every(Boolean)) {
			native();
			return;
		}
		const hadErrors = getFieldState(name).invalid;
		array.replace(nextRows);
		if (hadErrors) void trigger(name);
	};
	const splice = (start: number, deleteCount: number, inserted: unknown[], native: () => void) => {
		const previousRows = rows();
		const nextRows = [...previousRows];
		nextRows.splice(start, deleteCount, ...inserted);
		commit(
			previousRows,
			nextRows,
			({ ids, next }) => {
				const nextIds = [...ids];
				nextIds.splice(start, deleteCount, ...newIds(next, inserted.length));
				return { ids: nextIds, next: next + inserted.length };
			},
			native,
		);
	};
	const rearrange = (change: <T>(list: T[]) => T[], native?: () => void) => {
		const previousRows = rows();
		commit(previousRows, change(previousRows), ({ ids, next }) => ({ ids: change(ids), next }), native);
	};

	return {
		fields: current.ids.map((id) => ({ id })),
		append: (value) => splice(Number.POSITIVE_INFINITY, 0, toRows(value), () => array.append(value)),
		prepend: (value) => splice(0, 0, toRows(value), () => array.prepend(value)),
		insert: (index, value) => splice(index, 0, toRows(value), () => array.insert(index, value)),
		update: (index, value) => splice(index, 1, [value], () => array.update(index, value)),
		replace: (values) => {
			setRowIds(({ next }) => ({ ids: newIds(next, values.length), next: next + values.length }));
			array.replace(values);
		},
		swap: (indexA, indexB) =>
			rearrange(
				(list) => {
					const next = [...list];
					[next[indexA], next[indexB]] = [next[indexB], next[indexA]];
					return next;
				},
				() => array.swap(indexA, indexB),
			),
		move: (from, to) =>
			rearrange(
				(list) => {
					const next = [...list];
					next.splice(to, 0, ...next.splice(from, 1));
					return next;
				},
				() => array.move(from, to),
			),
		remove: (index) => {
			const removed = new Set(index === undefined ? [] : toRows(index));
			rearrange(
				(list) => (index === undefined ? [] : list.filter((_, position) => !removed.has(position))),
				Array.isArray(index) && index.length > 1 ? undefined : () => array.remove(index),
			);
		},
	};
}
