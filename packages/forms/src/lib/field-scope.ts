import { getElementContainerKind } from './normalized-form-config.js';
import { getElementChildren } from './element-children.js';
import { getValueAtPath } from './path-values.js';

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

function getMinItems(element: object): number {
	if (!('minItems' in element) || typeof element.minItems !== 'number') {
		return 0;
	}
	return element.minItems;
}

function treeHasDefaultValue(element: object): boolean {
	if (getDefaultValue(element) !== undefined) return true;
	const children = getElementChildren(element);
	return (
		children?.some((child) => typeof child === 'object' && child !== null && treeHasDefaultValue(child)) ?? false
	);
}

function getArrayLength(value: unknown): number {
	return Array.isArray(value) ? value.length : 0;
}

function getArraySeedCount(
	element: object,
	children: readonly object[],
	path: string,
	userDefaults: Record<string, unknown>,
): number {
	const fromValue = getArrayLength(getDefaultValue(element));
	const fromUser = getArrayLength(getValueAtPath(userDefaults, path));
	const fromChildren = children.some(treeHasDefaultValue) ? 1 : 0;
	return Math.max(fromValue, fromUser, getMinItems(element), fromChildren);
}

/**
 * Field defaults using the same path composition as renderers.
 *
 * @remarks
 * Fieldsets join (`address.street`). Arrays seed item indices and follow the
 * renderer scalar-item strategy (`tags.0` vs `contacts.0.name`). Seed count
 * includes provider `defaultValues` array length so child defaults apply to
 * every supplied item. Validation still uses {@link walkNamedElements}
 * template paths without indices.
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
			const scalar = children.length === 1;
			const seedCount = getArraySeedCount(element, children, path, userDefaults);
			for (let index = 0; index < seedCount; index += 1) {
				fields.push(
					...collectScopedDefaults(
						children,
						userDefaults,
						arrayItemScope(path, index, `seed-${index}`, {
							scalar,
							parentInstanceId: scope?.instanceId,
						}),
					),
				);
			}
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

export function flattenStepElements(steps: readonly { readonly elements?: readonly object[] }[]): object[] {
	return steps.flatMap((step) => [...(step.elements ?? [])]);
}
