import { expect, test } from 'vitest';
import * as root from '../dist/index.js';
import * as jsonSchema from '../dist/json-schema/index.js';

/**
 * The tests of the other files run against `src`, where one module is one class. A consumer reads the built entries,
 * and a build that copied a module into each entry would give it two `RegistryError` classes, so an error thrown from
 * `@schema-engine/registry/json-schema` would not be an `instanceof` the one it imports from the root.
 */
test('an error thrown through the json-schema entry is the RegistryError of the root entry', () => {
	expect(() => jsonSchema.replaceChildSlot({}, { $type: 'box', keys: [] }, {})).toThrow(root.RegistryError);
});
