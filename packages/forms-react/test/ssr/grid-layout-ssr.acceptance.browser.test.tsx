import { describe, test } from 'vitest';
import {
	expectSsrAreasAcceptance,
	expectSsrContainerAcceptance,
	expectSsrGridAcceptance,
	expectSsrNestedWidthsAcceptance,
	expectSsrSteppedAcceptance,
	expectSsrWidthsAcceptance,
} from '../../../../test-utils/ssr-grid-acceptance';
import {
	getSsrAcceptanceEngine,
	renderSsrAreasAcceptanceHtml,
	renderSsrContainerAcceptanceHtml,
	renderSsrLayoutAcceptanceHtml,
	renderSsrNestedWidthsAcceptanceHtml,
	renderSsrSteppedAcceptanceHtml,
	renderSsrWidthsAcceptanceHtml,
} from './render-form-ssr-html';

describe('SSR grid layout acceptance', () => {
	test('responsive layout at two widths without application JavaScript', async () => {
		await expectSsrGridAcceptance(renderSsrLayoutAcceptanceHtml(), getSsrAcceptanceEngine().getLayout());
	});

	test('named widths and offsets lay out on twelve tracks at two widths', async () => {
		await expectSsrWidthsAcceptance(renderSsrWidthsAcceptanceHtml(), getSsrAcceptanceEngine().getLayout());
	});

	test('a fieldset and an array row lay their children out on their own twelve tracks', async () => {
		await expectSsrNestedWidthsAcceptance(
			renderSsrNestedWidthsAcceptanceHtml(),
			getSsrAcceptanceEngine().getLayout(),
			['Nest', 'Row'],
		);
	});

	test('A drawn layout places fields', async () => {
		await expectSsrAreasAcceptance(renderSsrAreasAcceptanceHtml(), getSsrAcceptanceEngine().getLayout());
	});

	test('The template changes by breakpoint and each wizard step draws its own template', async () => {
		await expectSsrSteppedAcceptance(renderSsrSteppedAcceptanceHtml(), getSsrAcceptanceEngine().getLayout());
	});

	test('a container theme follows the width of its container, not the window', async () => {
		const { html, layout } = renderSsrContainerAcceptanceHtml();
		await expectSsrContainerAcceptance(html, layout);
	});
});
