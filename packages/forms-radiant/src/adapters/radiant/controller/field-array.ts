import type { FormStore } from '@ecopages/radiant-ui/form';
import type { FieldArrayValue } from '../../types';
import { readValue } from './values';
import { writeValue } from './write-value';

interface Row {
	id: string;
	value: unknown;
	previousIndex?: number;
}

let nextId = 0;
function createRow(value: unknown): Row {
	return { id: `field-${++nextId}`, value };
}

const arrays = new WeakMap<FormStore, Map<string, FieldArrayController>>();

export function getFieldArray(store: FormStore, name: string): FieldArrayController {
	let fields = arrays.get(store);
	if (!fields) {
		fields = new Map();
		arrays.set(store, fields);
	}
	let array = fields.get(name);
	if (!array) {
		array = new FieldArrayController(store, name);
		fields.set(name, array);
	}
	return array;
}

/** Row identity belongs to a form and field, independently of component lifetimes. */
class FieldArrayController implements FieldArrayValue {
	private rows: Row[] = [];
	private source: unknown;

	constructor(
		private readonly store: FormStore,
		private readonly name: string,
	) {}

	private current(): Row[] {
		const source = this.store.values[this.name];
		const values = readValue(this.store.getValues(), this.name) ?? [];
		if (!Array.isArray(values)) throw new TypeError(`Field "${this.name}" must contain an array.`);
		if (source !== this.source) this.rows = [];
		this.source = source;
		this.rows = values.map((value, index) => ({
			id: this.rows[index]?.id ?? createRow(value).id,
			value,
			previousIndex: index,
		}));
		return this.rows;
	}

	get fields(): Array<{ id: string }> {
		return this.current().map(({ id }) => ({ id }));
	}

	private commit(rows: Row[]): void {
		const values = rows.map(({ value }) => value);
		this.rows = rows;
		this.source = values;
		this.store.errors = this.reindex(this.store.errors, rows);
		this.store.touched = this.reindex(this.store.touched, rows);
		this.store.dirty = this.reindex(this.store.dirty, rows);
		writeValue(this.store, this.name, values);
	}

	private reindex<T>(state: Record<string, T>, rows: Row[]): Record<string, T> {
		const prefix = `${this.name}.`;
		const next = Object.fromEntries(Object.entries(state).filter(([name]) => !name.startsWith(prefix)));
		for (const [name, value] of Object.entries(state)) {
			if (!name.startsWith(prefix)) continue;
			const [oldIndex, ...suffix] = name.slice(prefix.length).split('.');
			const index = rows.findIndex((row) => row.previousIndex === Number(oldIndex));
			if (index >= 0) next[`${prefix}${index}${suffix.length ? `.${suffix.join('.')}` : ''}`] = value;
		}
		return next;
	}

	append = (value: unknown): void => this.insert(this.current().length, value);
	prepend = (value: unknown): void => this.insert(0, value);
	insert = (index: number, value: unknown): void => {
		const rows = [...this.current()];
		if (!Number.isInteger(index) || index < 0 || index > rows.length) return;
		rows.splice(index, 0, ...(Array.isArray(value) ? value : [value]).map(createRow));
		this.commit(rows);
	};
	swap = (indexA: number, indexB: number): void => {
		const rows = [...this.current()];
		if (!this.validIndex(indexA, rows) || !this.validIndex(indexB, rows)) return;
		[rows[indexA], rows[indexB]] = [rows[indexB], rows[indexA]];
		this.commit(rows);
	};
	move = (indexA: number, indexB: number): void => {
		const rows = [...this.current()];
		if (!this.validIndex(indexA, rows) || !this.validIndex(indexB, rows)) return;
		const [row] = rows.splice(indexA, 1);
		rows.splice(indexB, 0, row);
		this.commit(rows);
	};
	update = (index: number, value: unknown): void => {
		const rows = [...this.current()];
		if (!this.validIndex(index, rows)) return;
		rows[index] = createRow(value);
		this.commit(rows);
	};
	replace = (values: unknown[]): void => this.commit(values.map(createRow));
	remove = (index?: number | number[]): void => {
		const indexes = new Set(Array.isArray(index) ? index : [index]);
		this.commit(index === undefined ? [] : this.current().filter((_, rowIndex) => !indexes.has(rowIndex)));
	};
	private validIndex(index: number, rows: Row[]): boolean {
		return Number.isInteger(index) && index >= 0 && index < rows.length;
	}
}
