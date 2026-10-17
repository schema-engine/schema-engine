import { getElementContainerKind } from './normalized-form-config.js';
import { getElementChildren } from './element-children.js';
import { clonePlainValue, getValueAtPath, mergePathValues, setValueAtPath } from './path-values.js';
import { isPlainObject } from './is-plain-object.js';

/**
 * Shared field-path semantics for React and Radiant renderers.
 *
 * Configuration describes a field. Location (`address`, `contacts.0`) is a
 * render-time scope. Containers must not clone configs to change paths.
 */

export type FieldNameStrategy = 'join' | 'replace';

export interface FieldScope {
	/** Parent object or array-item path, e.g. `address` or `contacts.0`. */
	readonly namePrefix?: string;
	/**
	 * `join` (fieldset / object array items): `${prefix}.${child.name}`.
	 * `replace` (scalar array items): the prefix is the field name.
	 */
	readonly nameStrategy?: FieldNameStrategy;
	/**
	 * Stable instance identity for this render (array item id, not index).
	 * Used for HTML ids and React keys so removal does not reuse ids.
	 */
	readonly instanceId?: string;
}

export function getElementName(element: object): string | undefined {
	if (!('name' in element) || typeof element.name !== 'string' || element.name.length === 0) {
		return undefined;
	}
	return element.name;
}

export function getElementId(element: object): string | undefined {
	if (!('id' in element) || typeof element.id !== 'string' || element.id.length === 0) {
		return undefined;
	}
	return element.id;
}

export function composeFieldName(element: object, scope?: FieldScope): string | undefined {
	const childName = getElementName(element);
	const prefix = scope?.namePrefix;
	const strategy = scope?.nameStrategy ?? 'join';

	if (strategy === 'replace') {
		return prefix;
	}

	if (!childName) {
		return undefined;
	}

	return prefix ? `${prefix}.${childName}` : childName;
}

export function composeFieldId(element: object, scope?: FieldScope): string | undefined {
	const childId = getElementId(element);
	if (!childId) return undefined;
	return scope?.instanceId ? `${childId}_${scope.instanceId}` : childId;
}

export function composeElementKey(element: object, index: number, scope?: FieldScope): string {
	const type = '$type' in element && typeof element.$type === 'string' ? element.$type : 'element';
	const id = getElementId(element);
	const childIdentity = id ?? `${type}_${index}`;
	if (scope?.instanceId) {
		return `${scope.instanceId}:${childIdentity}`;
	}
	return `${id ?? type}_${index}`;
}

export function arrayItemScope(
	arrayName: string,
	index: number,
	instanceId: string,
	options?: { readonly scalar?: boolean; readonly parentInstanceId?: string },
): FieldScope {
	return {
		namePrefix: `${arrayName}.${index}`,
		nameStrategy: options?.scalar ? 'replace' : 'join',
		instanceId: options?.parentInstanceId ? `${options.parentInstanceId}:${instanceId}` : instanceId,
	};
}

export function objectFieldScope(objectName: string, parent?: Pick<FieldScope, 'instanceId'>): FieldScope {
	return {
		namePrefix: objectName,
		nameStrategy: 'join',
		instanceId: parent?.instanceId,
	};
}

export interface FieldOverlay {
	/** Render-time field path, wins over the config's own `name`. */
	readonly name?: string;
	/** Render-time HTML id, wins over the config's own `id`. */
	readonly id?: string;
	/** Stable array-item identity forwarded to nested containers. */
	readonly instanceId?: string;
}

/**
 * Apply render-time field overlays on top of a frozen normalized element.
 * The frozen config is not cloned by containers; this shallow overlay is the
 * only permitted name/id/instanceId override, applied at render time.
 */
export function applyFieldOverlay<T extends object>(config: T, overlay?: FieldOverlay): T {
	if (!overlay) return config;
	return {
		...config,
		...(overlay.name !== undefined ? { name: overlay.name } : {}),
		...(overlay.id !== undefined ? { id: overlay.id } : {}),
		...(overlay.instanceId !== undefined ? { instanceId: overlay.instanceId } : {}),
	} as T;
}

export interface NamedElementNode<T extends object = object> {
	readonly path: string;
	readonly element: T;
	readonly hasChildren: boolean;
	/** Number of unnamed array item boundaries between this node and its path. */
	readonly arrayItemDepth?: number;
}

/**
 * Walk named elements depth-first, composing dotted paths the same way
 * fieldsets do at render time (`address.street`). Array indices are not
 * expanded here — consumers expand templates against live values.
 * @param fallbackToId Use authored ids for unnamed constraint hosts.
 */
export function walkNamedElements<T extends object>(
	elements: readonly T[],
	basePath = '',
	fallbackToId = false,
): NamedElementNode<T>[] {
	return walkScopedElements(elements, basePath, false, 0, fallbackToId);
}

function walkScopedElements<T extends object>(
	elements: readonly T[],
	basePath: string,
	replace = false,
	arrayItemDepth = 0,
	fallbackToId = false,
): NamedElementNode<T>[] {
	const nodes: NamedElementNode<T>[] = [];
	for (const element of elements) {
		const name = getElementName(element) ?? (fallbackToId ? getElementId(element) : undefined);
		if (!name && !replace) continue;
		const path = replace ? basePath : basePath ? `${basePath}.${name}` : name!;
		const children = getElementChildren(element) as T[] | undefined;
		const hasChildren = Boolean(children?.length);
		nodes.push({ path, element, hasChildren, ...(arrayItemDepth > 0 ? { arrayItemDepth } : {}) });
		if (children?.length) {
			const scalarArrayItems = getElementContainerKind(element) === 'array' && children.length === 1;
			nodes.push(
				...walkScopedElements(
					children,
					path,
					scalarArrayItems,
					scalarArrayItems ? arrayItemDepth + 1 : 0,
					fallbackToId,
				),
			);
		}
	}
	return nodes;
}

export function walkLeafFields<T extends object>(elements: readonly T[], basePath = ''): NamedElementNode<T>[] {
	return walkNamedElements(elements, basePath).filter((node) => !node.hasChildren);
}

function getDefaultValue(element: object): unknown {
	if (!('defaultValue' in element)) return undefined;
	return (element as { defaultValue?: unknown }).defaultValue;
}

function treeHasDefaultValue(element: object): boolean {
	if (getDefaultValue(element) !== undefined) return true;
	const children = getElementChildren(element);
	return (
		children?.some((child) => typeof child === 'object' && child !== null && treeHasDefaultValue(child)) ?? false
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function usesScalarArrayItem(
	element: object,
	path: string,
	children: readonly object[],
	userDefaults: Record<string, unknown>,
): boolean {
	if (children.length !== 1) return false;
	if (getElementChildren(children[0])?.length) return false;
	const defaultItemValues = 'initialValues' in element ? element.initialValues : undefined;
	const arrayValue = getValueAtPath(userDefaults, path) ?? getDefaultValue(element);
	const firstItem = Array.isArray(arrayValue) ? arrayValue[0] : undefined;
	return !isRecord(defaultItemValues) && !isRecord(firstItem) && !isRecord(getDefaultValue(children[0]));
}

function childDefaultValue(element: object): unknown {
	const defaultValue = getDefaultValue(element);
	if (defaultValue !== undefined) return clonePlainValue(defaultValue);
	const children = getElementChildren(element) as object[] | undefined;
	if (!children?.length) return '';
	if (getElementContainerKind(element) === 'array') {
		return seedArrayRows(element, undefined, usesScalarArrayItem(element, '', children, {}));
	}
	return namedChildDefaults(children);
}

function namedChildDefaults(children: readonly object[]): Record<string, unknown> {
	return Object.fromEntries(
		children.flatMap((child) => {
			const name = getElementName(child);
			return name ? [[name, childDefaultValue(child)]] : [];
		}),
	);
}

/**
 * Value of one new row of an array container.
 *
 * @remarks
 * Every named child contributes its `defaultValue`, or `''` for a leaf without
 * one; an object container child contributes its own children's defaults and an
 * array container child its {@link seedArrayRows}. A record `initialValues` on
 * the container is then shallow-merged over those child defaults. A scalar row
 * ({@link usesScalarArrayItem}) is the single child's default.
 */
export function createArrayRowDefault(element: object, scalar: boolean): unknown {
	const children = (getElementChildren(element) ?? []) as object[];
	if (scalar) return children[0] ? childDefaultValue(children[0]) : '';
	const row = namedChildDefaults(children);
	const initialValues = 'initialValues' in element ? element.initialValues : undefined;
	return isPlainObject(initialValues) ? Object.assign(row, clonePlainValue(initialValues)) : row;
}

/**
 * Rows of an array container: `rows` padded with {@link createArrayRowDefault}
 * up to `minItems`.
 *
 * @remarks
 * Without `rows`, an array seeds `minItems` rows, and at least one when any
 * descendant declares a `defaultValue`. Supplied rows are returned as given, not merged
 * with child defaults.
 */
export function seedArrayRows(element: object, rows: readonly unknown[] | undefined, scalar: boolean): unknown[] {
	const minItems = 'minItems' in element && typeof element.minItems === 'number' ? element.minItems : 0;
	const children = (getElementChildren(element) ?? []) as object[];
	const count = Math.max(rows?.length ?? 0, minItems, !rows && children.some(treeHasDefaultValue) ? 1 : 0);
	return Array.from({ length: count }, (_, index) =>
		rows && index < rows.length ? rows[index] : createArrayRowDefault(element, scalar),
	);
}

/**
 * Field defaults using the same path composition as renderers.
 *
 * @remarks
 * Fieldsets join (`address.street`). Arrays seed item indices and follow the
 * renderer scalar-item strategy (`tags.0` vs `contacts.0.name`). Child
 * defaults apply to every row supplied by provider `defaultValues` or the
 * array's own `defaultValue`; rows added by {@link seedArrayRows} are whole
 * {@link createArrayRowDefault} values. Validation still uses
 * {@link walkNamedElements} template paths without indices.
 */
export function collectFieldDefaults(
	elements: readonly object[],
	userDefaults: Record<string, unknown> = {},
): Array<{ name: string; defaultValue?: unknown }> {
	return collectScopedDefaults(elements, userDefaults);
}

function collectScopedDefaults(
	elements: readonly object[],
	userDefaults: Record<string, unknown>,
	scope?: FieldScope,
): Array<{ name: string; defaultValue?: unknown }> {
	const fields: Array<{ name: string; defaultValue?: unknown }> = [];

	for (const element of elements) {
		const children = getElementChildren(element) as object[] | undefined;
		const path = composeFieldName(element, scope);

		if (getElementContainerKind(element) === 'array' && children?.length) {
			if (!path) continue;
			fields.push({ name: path, defaultValue: getDefaultValue(element) });
			const scalar = usesScalarArrayItem(element, path, children, userDefaults);
			const providedRows = [getValueAtPath(userDefaults, path), getDefaultValue(element)].find(Array.isArray);
			seedArrayRows(element, providedRows, scalar).forEach((row, index) => {
				const itemScope = arrayItemScope(path, index, `seed-${index}`, {
					scalar,
					parentInstanceId: scope?.instanceId,
				});
				if (providedRows && index < providedRows.length) {
					fields.push(...collectScopedDefaults(children, userDefaults, itemScope));
				} else if (itemScope.namePrefix) {
					fields.push({ name: itemScope.namePrefix, defaultValue: row });
				}
			});
			continue;
		}

		if (!path) continue;

		fields.push({ name: path, defaultValue: getDefaultValue(element) });

		if (children?.length) {
			fields.push(...collectScopedDefaults(children, userDefaults, objectFieldScope(path, scope)));
		}
	}

	return fields;
}

/**
 * Initial form values: {@link collectFieldDefaults} merged under provider
 * `defaultValues`, with every array container padded to `minItems` by
 * {@link seedArrayRows}.
 *
 * @remarks
 * The padding runs after the merge because a provider array sets the row
 * count, dropping seeded rows past its length.
 */
export function collectInitialValues(
	elements: readonly object[],
	userDefaults: Record<string, unknown> = {},
): Record<string, unknown> {
	const values = mergePathValues(collectFieldDefaults(elements, userDefaults), userDefaults);
	padArrayRows(elements, values);
	return values;
}

function padArrayRows(elements: readonly object[], values: Record<string, unknown>, scope?: FieldScope): void {
	for (const element of elements) {
		const path = composeFieldName(element, scope);
		const children = getElementChildren(element) as object[] | undefined;
		if (!path || !children?.length) continue;

		if (getElementContainerKind(element) !== 'array') {
			padArrayRows(children, values, objectFieldScope(path, scope));
			continue;
		}

		const rows = getValueAtPath(values, path);
		if (!Array.isArray(rows)) continue;
		const scalar = usesScalarArrayItem(element, path, children, values);
		const seeded = seedArrayRows(element, rows, scalar);
		if (seeded.length > rows.length) setValueAtPath(values, path, seeded);
		for (let index = 0; index < seeded.length; index += 1) {
			padArrayRows(
				children,
				values,
				arrayItemScope(path, index, `seed-${index}`, { scalar, parentInstanceId: scope?.instanceId }),
			);
		}
	}
}

export function flattenStepElements(steps: readonly { readonly elements?: readonly object[] }[]): object[] {
	return steps.flatMap((step) => [...(step.elements ?? [])]);
}
