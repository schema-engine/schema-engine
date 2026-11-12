import { describe, inject, test } from 'vitest';
import {
	expectSsrAreasAcceptance,
	expectSsrGridAcceptance,
	expectSsrNestedWidthsAcceptance,
	expectSsrSteppedAcceptance,
	expectSsrWidthsAcceptance,
} from '../../../../test-utils/ssr-grid-acceptance';

describe('SSR grid layout acceptance', () => {
	test('responsive layout at two widths without application JavaScript', async () => {
		await expectSsrGridAcceptance(inject('ssrLayoutHtml'), inject('ssrLayoutTheme'));
	});

	test('named widths and offsets lay out on twelve tracks at two widths', async () => {
		await expectSsrWidthsAcceptance(inject('ssrWidthsHtml'), inject('ssrLayoutTheme'));
	});

	test('a fieldset and an array row lay their children out on their own twelve tracks', async () => {
		const html = inject('ssrNestedWidthsHtml').replaceAll('<\\/script>', '</script>');
		await expectSsrNestedWidthsAcceptance(html, inject('ssrLayoutTheme'), ['Nest', 'Row']);
	});

	test('A drawn layout places fields', async () => {
		await expectSsrAreasAcceptance(inject('ssrAreasHtml'), inject('ssrLayoutTheme'));
	});

	test('The template changes by breakpoint and each wizard step draws its own template', async () => {
		await expectSsrSteppedAcceptance(inject('ssrSteppedHtml'), inject('ssrLayoutTheme'));
	});
});
