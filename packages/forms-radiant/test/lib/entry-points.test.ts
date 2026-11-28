import { expect, test } from 'vitest';
import * as entry from '@schema-engine/forms-radiant/primitives';

test('a container element lays out its children with ChildGrid alone', () => {
	expect(entry).toHaveProperty('ChildGrid');
	expect(entry).not.toHaveProperty('mergeChildrenGridHost');
});
