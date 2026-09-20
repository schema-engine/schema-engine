/**
 * Field-array operations shared by React and Radiant form adapters.
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
