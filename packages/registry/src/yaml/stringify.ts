import { Document, isPair, isScalar, visit } from 'yaml';
import type { YAMLMap } from 'yaml';

/**
 * Limits for a map written in flow style: scalar entries only, at most this many, and about this
 * many characters.
 *
 * @remarks
 * `grid: { width: half }` reads better inline; an element with many keys does not.
 */
const MAX_FLOW_ENTRIES = 3;
const MAX_FLOW_LENGTH = 48;

export type StringifyYamlOptions = {
	/** Adds a `# yaml-language-server: $schema=<url>` header, which editors read to offer completion. */
	schemaUrl?: string;
};

function isShortLeafMap(map: YAMLMap): boolean {
	if (map.items.length === 0 || map.items.length > MAX_FLOW_ENTRIES) {
		return false;
	}
	let length = 0;
	for (const pair of map.items) {
		if (!isScalar(pair.key) || !isScalar(pair.value)) {
			return false;
		}
		const value = String(pair.value.value);
		if (value.includes('\n')) {
			return false;
		}
		length += String(pair.key.value).length + value.length + 4;
	}
	return length <= MAX_FLOW_LENGTH;
}

/**
 * Write a value as YAML text.
 *
 * @remarks
 * An object that appears twice is written out twice, not as an anchor and an alias. A short map of scalars under a key is written in flow style (`grid: { width: half }`); every
 * other collection, including a sequence item, is written in block style. Lines are not folded.
 * Strings that would read as another type are quoted, so `"1.10"` stays a string when parsed back.
 * `no` and `on` are not quoted, because YAML 1.2 reads them as strings; a YAML 1.1 reader would not.
 */
export function stringifyYaml(value: unknown, options?: StringifyYamlOptions): string {
	const schemaUrl = options?.schemaUrl;
	if (schemaUrl !== undefined && /[\r\n]/.test(schemaUrl)) {
		throw new TypeError('schemaUrl must be a single line');
	}
	const doc = new Document(value, { version: '1.2', aliasDuplicateObjects: false });
	visit(doc, {
		Map(_key, map, path) {
			if (isPair(path.at(-1)) && isShortLeafMap(map)) {
				map.flow = true;
			}
		},
	});
	const text = doc.toString({ lineWidth: 0 });
	return schemaUrl === undefined ? text : `# yaml-language-server: $schema=${schemaUrl}\n${text}`;
}
