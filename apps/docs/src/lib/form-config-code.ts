import type { FormConfig } from '@schema-engine/forms';

const RESERVED = new Set(['true', 'false', 'null', 'undefined']);

function isIdentifierKey(key: string): boolean {
	return /^[A-Za-z_$][\w$]*$/.test(key) && !RESERVED.has(key);
}

function serializeValue(value: unknown, indent: number): string {
	const pad = '\t'.repeat(indent);
	const inner = '\t'.repeat(indent + 1);
	if (value === null) return 'null';
	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const items = value.map((item) => `${inner}${serializeValue(item, indent + 1)}`);
		return `[\n${items.join(',\n')}\n${pad}]`;
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, item]) => item !== undefined)
			.map(([key, item]) => {
				const renderedKey = isIdentifierKey(key) ? key : `'${key.replaceAll("'", "\\'")}'`;
				return `${inner}${renderedKey}: ${serializeValue(item, indent + 1)}`;
			});
		if (entries.length === 0) return '{}';
		return `{\n${entries.join(',\n')}\n${pad}}`;
	}
	if (typeof value === 'string') return `'${value.replaceAll("'", "\\'")}'`;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return 'undefined';
}

/**
 * Serializes a form configuration into the same tab-indented TS literal style
 * used by the docs snippets, so generated examples cannot drift from demos.
 */
export function formConfigToCode(config: FormConfig, rootName = 'formConfig'): string {
	return `const ${rootName}: FormConfig = ${serializeValue(config, 0)};`;
}
