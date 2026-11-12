import { describe, test } from 'vitest';
import { expectSsrGridAcceptance, expectSsrWidthsAcceptance } from '../../../../test-utils/ssr-grid-acceptance';
import {
	getSsrAcceptanceEngine,
	renderSsrLayoutAcceptanceHtml,
	renderSsrWidthsAcceptanceHtml,
} from './render-form-ssr-html';

describe('SSR grid layout acceptance', () => {
	test('responsive layout at two widths without application JavaScript', async () => {
		await expectSsrGridAcceptance(renderSsrLayoutAcceptanceHtml(), getSsrAcceptanceEngine().getCompiledGrid());
	});

	test('named widths and offsets lay out on twelve tracks at two widths', async () => {
		await expectSsrWidthsAcceptance(renderSsrWidthsAcceptanceHtml(), getSsrAcceptanceEngine().getCompiledGrid());
	});
});
