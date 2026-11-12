import { describe, inject, test } from 'vitest';
import { expectSsrGridAcceptance, expectSsrWidthsAcceptance } from '../../../../test-utils/ssr-grid-acceptance';

describe('SSR grid layout acceptance', () => {
	test('responsive layout at two widths without application JavaScript', async () => {
		await expectSsrGridAcceptance(inject('ssrLayoutHtml'), inject('ssrLayoutCompiled'));
	});

	test('named widths and offsets lay out on twelve tracks at two widths', async () => {
		await expectSsrWidthsAcceptance(inject('ssrWidthsHtml'), inject('ssrLayoutCompiled'));
	});
});
