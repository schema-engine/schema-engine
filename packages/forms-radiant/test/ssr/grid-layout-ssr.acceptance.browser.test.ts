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
		await expectSsrGridAcceptance(inject('ssrLayoutHtml'), inject('ssrLayoutCompiled'));
	});

	test('named widths and offsets lay out on twelve tracks at two widths', async () => {
		await expectSsrWidthsAcceptance(inject('ssrWidthsHtml'), inject('ssrLayoutCompiled'));
	});

	test('a fieldset and an array row lay their children out on their own twelve tracks', async () => {
		const html = inject('ssrNestedWidthsHtml').replaceAll('<\\/script>', '</script>');
		await expectSsrNestedWidthsAcceptance(html, inject('ssrLayoutCompiled'), ['Nest', 'Row']);
	});

	test('a drawn layout places fields by area from CSS alone', async () => {
		await expectSsrAreasAcceptance(inject('ssrAreasHtml'), inject('ssrLayoutCompiled'));
	});

	test('a step draws its own template by breakpoint while another step keeps the form grid', async () => {
		await expectSsrSteppedAcceptance(inject('ssrSteppedHtml'), inject('ssrLayoutCompiled'));
	});
});
