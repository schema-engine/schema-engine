import { getElementChildren } from '@/lib/element-children';

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
}

/**
 * Walk named elements depth-first, composing dotted paths the same way
 * fieldsets do at render time (`address.street`). Array indices are not
 * expanded here — adapters expand templates against live values.
 */
export function walkNamedElements<T extends object>(elements: readonly T[], basePath = ''): NamedElementNode<T>[] {
	const nodes: NamedElementNode<T>[] = [];

	for (const element of elements) {
		const name = getElementName(element);
		if (!name) continue;

		const path = basePath ? `${basePath}.${name}` : name;
		const children = getElementChildren(element);
		const hasChildren = Boolean(children?.length);
		nodes.push({ path, element, hasChildren });

		if (children?.length) {
			nodes.push(...walkNamedElements(children as T[], path));
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

export function collectFieldDefaults(elements: readonly object[]): Array<{ name: string; defaultValue?: unknown }> {
	return walkNamedElements(elements).map(({ path, element }) => ({
		name: path,
		defaultValue: getDefaultValue(element),
	}));
}

export function flattenStepElements(steps: readonly { readonly elements?: readonly object[] }[]): object[] {
	return steps.flatMap((step) => [...(step.elements ?? [])]);
}
