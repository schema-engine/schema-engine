import { expect, test } from 'vitest';
import * as entry from '@schema-engine/forms';

test('the root entry exposes value validation and participation', () => {
	expect(entry).toHaveProperty('validateFormValues');
	expect(entry).toHaveProperty('resolveParticipation');
	expect(entry).toHaveProperty('foldFieldParticipation');
	expect(entry).not.toHaveProperty('collectStepFieldPaths');
});
