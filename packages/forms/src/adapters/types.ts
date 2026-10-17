/**
 * Field-array operations shared by React and Radiant form adapters.
 *
 * @remarks
 * Errors and touched state move with their rows. An operation naming a row that
 * does not exist does nothing (`insert` also accepts the index past the last
 * row), and `remove` removes each listed row once, however often it is listed.
 */
export interface FieldArrayValue {
	fields: Array<{ id: string }>;
	append: (value: unknown) => void;
	prepend: (value: unknown) => void;
	insert: (index: number, value: unknown) => void;
	swap: (indexA: number, indexB: number) => void;
	move: (indexA: number, indexB: number) => void;
	update: (index: number, value: unknown) => void;
	replace: (value: unknown[]) => void;
	remove: (index?: number | number[]) => void;
}
