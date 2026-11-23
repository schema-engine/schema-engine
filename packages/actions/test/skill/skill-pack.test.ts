import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { expectPackedSkill } from '../../../../test-utils/packed-skill';

test('the packed package holds every file of its skill folder', () => {
	expectPackedSkill(fileURLToPath(new URL('../../', import.meta.url)));
});
