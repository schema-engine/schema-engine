import { describe, test } from 'vitest';
import {
	expectSsrAreasAcceptance,
	expectSsrGridAcceptance,
	expectSsrNestedWidthsAcceptance,
	expectSsrSteppedAcceptance,
	expectSsrWidthsAcceptance,
} from '../../../../test-utils/ssr-grid-acceptance';
import {
	getSsrAcceptanceEngine,
	renderSsrAreasAcceptanceHtml,
	renderSsrLayoutAcceptanceHtml,
	renderSsrNestedWidthsAcceptanceHtml,
	renderSsrSteppedAcceptanceHtml,
	renderSsrWidthsAcceptanceHtml,
} from './render-form-ssr-html';

describe('SSR grid layout acceptance', () => {
	test('responsive layout at two widths without application JavaScript', async () => {
		await expectSsrGridAcceptance(renderSsrLayoutAcceptanceHtml(), getSsrAcceptanceEngine().getCompiledGrid());
	});

	test('named widths and offsets lay out on twelve tracks at two widths', async () => {
		await expectSsrWidthsAcceptance(renderSsrWidthsAcceptanceHtml(), getSsrAcceptanceEngine().getCompiledGrid());
	});

	test('a fieldset and an array row lay their children out on their own twelve tracks', async () => {
		await expectSsrNestedWidthsAcceptance(
			renderSsrNestedWidthsAcceptanceHtml(),
			getSsrAcceptanceEngine().getCompiledGrid(),
			['Nest', 'Row'],
		);
	});

	test('a drawn layout places fields by area from CSS alone', async () => {
		await expectSsrAreasAcceptance(renderSsrAreasAcceptanceHtml(), getSsrAcceptanceEngine().getCompiledGrid());
	});

	test('a step draws its own template by breakpoint while another step keeps the form grid', async () => {
		await expectSsrSteppedAcceptance(renderSsrSteppedAcceptanceHtml(), getSsrAcceptanceEngine().getCompiledGrid());
	});
});
