import { describe, inject, test } from 'vitest';
import { expectSsrGridAcceptance } from '../../../../test-utils/ssr-grid-acceptance';

describe('SSR grid layout acceptance', () => {
	test('responsive layout at two widths without application JavaScript', async () => {
		await expectSsrGridAcceptance(inject('ssrLayoutHtml'), inject('ssrLayoutCompiled'));
	});
});
