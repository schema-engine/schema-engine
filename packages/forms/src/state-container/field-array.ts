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

/** The operations of a field array, which a container keeps one set of per array path. */
export type FieldArrayCommands = Omit<FieldArrayValue, 'fields'>;

const NO_FIELDS: ReadonlyArray<{ id: string }> = Object.freeze([]);
const fieldsByIds = new WeakMap<readonly string[], Array<{ id: string }>>();

/**
 * The `fields` of a field array: one `{ id }` per row, in row order.
 *
 * @remarks
 * The same array comes back for the same row ids, so a binding can compare it by reference.
 */
export function selectFields(rowIds: readonly string[] | undefined): Array<{ id: string }> {
	if (!rowIds) return NO_FIELDS as Array<{ id: string }>;
	let fields = fieldsByIds.get(rowIds);
	if (!fields) fieldsByIds.set(rowIds, (fields = rowIds.map((id) => ({ id }))));
	return fields;
}

/**
 * Builds the React Hook Form style field array a binding hands to its widgets.
 *
 * @param rowIds - The ids of the array's rows, from `snapshot.rowIds[path]`.
 * @param commands - The container's commands for the array, from `fieldArray(path)`.
 */
export function toFieldArrayValue(
	rowIds: readonly string[] | undefined,
	commands: FieldArrayCommands,
): FieldArrayValue {
	return { fields: selectFields(rowIds), ...commands };
}
